import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { workflows, workflowVersions, workflowExecutions } from '../../infra/db/schema/workflows.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

// ═══════════════════════════════════════════
// WORKFLOWS
// ═══════════════════════════════════════════

export async function listWorkflows(tenantId: string) {
  return db.select().from(workflows)
    .where(eq(workflows.orgId, tenantId))
    .orderBy(desc(workflows.updatedAt));
}

export async function getWorkflow(tenantId: string, workflowId: string) {
  const rows = await db.select().from(workflows)
    .where(and(eq(workflows.id, workflowId), eq(workflows.orgId, tenantId)))
    .limit(1);

  if (!rows[0]) throw new NotFoundError('Workflow', workflowId);
  return rows[0];
}

export async function createWorkflow(tenantId: string, input: {
  name: string; key: string;
}) {
  const [wf] = await db.insert(workflows).values({
    name: input.name,
    key: input.key,
    orgId: tenantId,
  }).returning();

  // Create initial draft version
  await db.insert(workflowVersions).values({
    workflowId: wf.id,
    version: 1,
    status: 'draft',
    nodes: [],
    edges: [],
  });

  return wf;
}

export async function saveDraft(tenantId: string, workflowId: string, draft: {
  nodes: Array<{ id: string; type: string; config: Record<string, unknown>; position: { x: number; y: number } }>;
  edges: Array<{ from: string; to: string; condition?: string }>;
}) {
  await getWorkflow(tenantId, workflowId);

  // Find current draft version
  const versions = await db.select().from(workflowVersions)
    .where(and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.status, 'draft')))
    .limit(1);

  if (!versions[0]) throw new ConflictError('No draft version found — create a new version first');

  const [updated] = await db.update(workflowVersions).set({
    nodes: draft.nodes,
    edges: draft.edges,
  }).where(eq(workflowVersions.id, versions[0].id)).returning();

  return updated;
}

export async function publishWorkflow(tenantId: string, workflowId: string, userId: string) {
  const wf = await getWorkflow(tenantId, workflowId);

  const draftVersions = await db.select().from(workflowVersions)
    .where(and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.status, 'draft')))
    .limit(1);

  if (!draftVersions[0]) throw new ConflictError('No draft version to publish');

  const draft = draftVersions[0];

  // Archive current published version
  await db.update(workflowVersions).set({ status: 'archived' })
    .where(and(eq(workflowVersions.workflowId, workflowId), eq(workflowVersions.status, 'published')));

  // Publish draft
  const [published] = await db.update(workflowVersions).set({
    status: 'published',
    publishedAt: new Date(),
    publishedBy: userId,
  }).where(eq(workflowVersions.id, draft.id)).returning();

  // Update workflow current version
  await db.update(workflows).set({
    currentVersion: draft.version,
    updatedAt: new Date(),
  }).where(eq(workflows.id, workflowId));

  // Create next draft version
  await db.insert(workflowVersions).values({
    workflowId,
    version: draft.version + 1,
    status: 'draft',
    nodes: draft.nodes,
    edges: draft.edges,
  });

  return published;
}

export async function getWorkflowVersions(tenantId: string, workflowId: string) {
  await getWorkflow(tenantId, workflowId);

  return db.select().from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId))
    .orderBy(desc(workflowVersions.version));
}
