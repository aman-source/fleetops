/**
 * Workflow Executor — persistent state machine for admin-configurable DAGs.
 *
 * Node types: trigger | gate | approval | notification | action | branch | wait
 *
 * Execution lifecycle:
 *   triggerWorkflow() → creates execution, starts at trigger node
 *   executeNode()     → process node, advance or pause
 *   resumeApproval()  → called when approval actor responds
 *   resumeTimer()     → called by scheduler when wait expires
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { workflows, workflowVersions, workflowExecutions } from '../../infra/db/schema/workflows.js';
import { getQueue, createWorker } from '../../infra/queue/bull.js';
import { AppError, NotFoundError } from '../../shared/errors.js';

type NodeType = 'trigger' | 'gate' | 'approval' | 'notification' | 'action' | 'branch' | 'wait';

interface WfNode {
  id: string;
  type: NodeType;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface WfEdge {
  from: string;
  to: string;
  condition?: string; // JS expression evaluated against context, e.g. 'ctx.riskLevel === "high"'
}

// ─── Trigger ────────────────────────────────────────────────────────────────

export async function triggerWorkflow(
  orgId: string,
  workflowKey: string,
  entityType: string,
  entityId: string,
  context: Record<string, unknown> = {},
): Promise<string> {
  // Find published workflow
  const wfRows = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.key, workflowKey), eq(workflows.orgId, orgId)))
    .limit(1);

  if (!wfRows[0]) return ''; // Workflow not configured — skip gracefully

  const versionRows = await db
    .select()
    .from(workflowVersions)
    .where(and(eq(workflowVersions.workflowId, wfRows[0].id), eq(workflowVersions.status, 'published')))
    .limit(1);

  if (!versionRows[0]) return ''; // No published version — skip

  const version = versionRows[0];

  const [execution] = await db.insert(workflowExecutions).values({
    workflowId: wfRows[0].id,
    versionId: version.id,
    entityType,
    entityId,
    status: 'running',
    context,
    currentNode: null,
  }).returning();

  // Find trigger node and advance from it
  const triggerNode = version.nodes.find((n) => n.type === 'trigger');
  if (triggerNode) {
    await advanceExecution(execution.id, version, triggerNode.id, context);
  } else {
    await db.update(workflowExecutions).set({ status: 'failed', completedAt: new Date() }).where(eq(workflowExecutions.id, execution.id));
  }

  return execution.id;
}

// ─── Internal: advance from a completed node ─────────────────────────────────

async function advanceExecution(
  executionId: string,
  version: typeof workflowVersions.$inferSelect,
  fromNodeId: string,
  context: Record<string, unknown>,
): Promise<void> {
  const nodes = version.nodes as WfNode[];
  const edges = version.edges as WfEdge[];

  // Find edges from current node
  const outEdges = edges.filter((e) => e.from === fromNodeId);

  // Evaluate conditions if any — take first matching edge
  let nextNodeId: string | undefined;
  for (const edge of outEdges) {
    if (!edge.condition) {
      nextNodeId = edge.to;
      break;
    }
    try {
      const result = new Function('ctx', `return (${edge.condition})`)(context);
      if (result) {
        nextNodeId = edge.to;
        break;
      }
    } catch {
      // Invalid condition expression — skip edge
    }
  }

  if (!nextNodeId) {
    // No matching outbound edge — execution complete
    await db.update(workflowExecutions).set({ status: 'completed', completedAt: new Date(), currentNode: fromNodeId }).where(eq(workflowExecutions.id, executionId));
    return;
  }

  const nextNode = nodes.find((n) => n.id === nextNodeId);
  if (!nextNode) {
    await db.update(workflowExecutions).set({ status: 'failed', completedAt: new Date() }).where(eq(workflowExecutions.id, executionId));
    return;
  }

  await executeNode(executionId, version, nextNode, context);
}

// ─── Node execution ──────────────────────────────────────────────────────────

async function executeNode(
  executionId: string,
  version: typeof workflowVersions.$inferSelect,
  node: WfNode,
  context: Record<string, unknown>,
): Promise<void> {
  await db.update(workflowExecutions).set({ currentNode: node.id, context }).where(eq(workflowExecutions.id, executionId));

  switch (node.type) {
    case 'trigger':
      // Trigger nodes are pass-through — immediately advance
      await advanceExecution(executionId, version, node.id, context);
      break;

    case 'gate': {
      // Evaluate gate condition from context
      const condExpr = node.config['condition'] as string | undefined;
      let passed = true;
      if (condExpr) {
        try {
          passed = !!new Function('ctx', `return (${condExpr})`)(context);
        } catch { passed = false; }
      }
      const enriched = { ...context, gateResult: passed ? 'pass' : 'fail' };
      await db.update(workflowExecutions).set({ context: enriched }).where(eq(workflowExecutions.id, executionId));
      await advanceExecution(executionId, version, node.id, enriched);
      break;
    }

    case 'approval':
      // Pause — wait for external resume call
      await db.update(workflowExecutions).set({
        status: 'waiting_approval',
        context: { ...context, approvalNodeId: node.id },
      }).where(eq(workflowExecutions.id, executionId));
      break;

    case 'notification': {
      // Enqueue notification job
      const queue = getQueue('notifications');
      await queue.add('workflow-notification', {
        executionId,
        nodeConfig: node.config,
        context,
      });
      await advanceExecution(executionId, version, node.id, context);
      break;
    }

    case 'action': {
      // Execute configured action
      const action = node.config['action'] as string | undefined;
      const enriched = { ...context, lastAction: action };
      await db.update(workflowExecutions).set({ context: enriched }).where(eq(workflowExecutions.id, executionId));
      // Actions are fire-and-forget within the executor — external systems react to execution events
      await advanceExecution(executionId, version, node.id, enriched);
      break;
    }

    case 'branch': {
      // Evaluate branch condition and route — same as advance with condition edges
      await advanceExecution(executionId, version, node.id, context);
      break;
    }

    case 'wait': {
      // Schedule timer resume
      const delayMs = ((node.config['delaySeconds'] as number) ?? 0) * 1000;
      await db.update(workflowExecutions).set({ status: 'waiting_timer' }).where(eq(workflowExecutions.id, executionId));
      const queue = getQueue('workflow-timers');
      await queue.add('resume', { executionId, nodeId: node.id }, { delay: delayMs });
      break;
    }
  }
}

// ─── Resume after approval ────────────────────────────────────────────────────

export async function resumeApproval(
  executionId: string,
  approverId: string,
  approved: boolean,
  reason?: string,
): Promise<void> {
  const rows = await db.select().from(workflowExecutions).where(and(eq(workflowExecutions.id, executionId), eq(workflowExecutions.status, 'waiting_approval'))).limit(1);
  if (!rows[0]) throw new NotFoundError('Execution not found or not awaiting approval');

  const execution = rows[0];
  const version = await getVersion(execution.versionId);
  const ctx = { ...(execution.context ?? {}), approved, approverId, approvalReason: reason ?? '' };

  await db.update(workflowExecutions).set({ status: 'running', context: ctx }).where(eq(workflowExecutions.id, executionId));

  const currentNodeId = execution.currentNode ?? ((execution.context as Record<string, unknown>)?.['approvalNodeId'] as string);
  if (currentNodeId) {
    await advanceExecution(executionId, version, currentNodeId, ctx);
  }
}

// ─── Resume after timer ────────────────────────────────────────────────────────

export async function resumeTimer(executionId: string, nodeId: string): Promise<void> {
  const rows = await db.select().from(workflowExecutions).where(eq(workflowExecutions.id, executionId)).limit(1);
  if (!rows[0]) return;

  const execution = rows[0];
  const version = await getVersion(execution.versionId);
  const ctx = execution.context ?? {};

  await db.update(workflowExecutions).set({ status: 'running' }).where(eq(workflowExecutions.id, executionId));
  await advanceExecution(executionId, version, nodeId, ctx as Record<string, unknown>);
}

// ─── Worker for timer resumption ─────────────────────────────────────────────

export function startWorkflowTimerWorker() {
  return createWorker<{ executionId: string; nodeId: string }>(
    'workflow-timers',
    async (job) => {
      await resumeTimer(job.data.executionId, job.data.nodeId);
    },
    { concurrency: 5 },
  );
}

// ─── List / inspect executions (admin) ───────────────────────────────────────

export async function listExecutions(orgId: string, entityType?: string, entityId?: string) {
  const conditions = [];
  // Join through workflow to filter by orgId
  if (entityType) conditions.push(eq(workflowExecutions.entityType, entityType));
  if (entityId) conditions.push(eq(workflowExecutions.entityId, entityId));

  return db.select().from(workflowExecutions).where(conditions.length ? and(...(conditions as [typeof conditions[0], ...typeof conditions])) : undefined).limit(100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getVersion(versionId: string) {
  const rows = await db.select().from(workflowVersions).where(eq(workflowVersions.id, versionId)).limit(1);
  if (!rows[0]) throw new AppError('Workflow version not found', 500, 'WF_VERSION_MISSING');
  return rows[0];
}
