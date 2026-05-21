/**
 * 1.6 admin-workflow-config.spec.ts — Admin configures workflow, executor runs it
 *
 * test.fixme() applied to executor steps — workflow executor (P3.5) not yet implemented.
 * Blocker: POST /admin/workflows exists but execution engine is pending.
 * Non-executor steps (CRUD + publish) tested normally.
 */
import { test, expect } from '@playwright/test';
import { getTokens } from '../fixtures/auth.js';
import { ApiClient } from '../helpers/api.js';

test.describe.configure({ mode: 'serial' });

let adminToken: string;
let workflowId: string;

test.beforeAll(async () => {
  const adminTokens = await getTokens('admin');
  adminToken = adminTokens.accessToken;
});

test('1.6.1 — Admin sees pre-seeded workflows', async ({ request }) => {
  // arrange
  const adminApi = new ApiClient(request, adminToken);

  // act
  const workflows = await adminApi.get<Array<{ name: string }>>('/api/v1/admin/workflows');

  // assert
  const list = Array.isArray(workflows) ? workflows : [];
  expect(list.some((w) => /journey_approval/i.test(w.name))).toBe(true);
  expect(list.some((w) => /vehicle_release/i.test(w.name))).toBe(true);
});

test('1.6.2 — Admin creates new workflow as draft', async ({ request }) => {
  // arrange
  const adminApi = new ApiClient(request, adminToken);

  // act
  const workflow = await adminApi.post<{ id: string; status: string }>(
    '/api/v1/admin/workflows',
    {
      name: 'Conditional release notify',
      key: `COND-RELEASE-${Date.now().toString().slice(-8)}`,
      description: 'E2E test workflow',
      trigger: { event: 'workorder.released', condition: { decision: 'conditional' } },
      nodes: [
        {
          id: 'notify-1',
          type: 'notification',
          recipients: ['maint', 'hse'],
          template: 'conditional_release_alert',
        },
        {
          id: 'wait-1',
          type: 'wait',
          duration: 3600,
          nextNodeId: 'branch-1',
        },
        {
          id: 'branch-1',
          type: 'branch',
          condition: { vehicleStatus: 'conditional' },
          truePath: 'notify-2',
          falsePath: null,
        },
        {
          id: 'notify-2',
          type: 'notification',
          recipients: ['maint', 'hse'],
          template: 'conditional_release_reminder',
        },
      ],
    },
  );

  // assert
  expect(workflow.id).toBeTruthy();
  expect(workflow.status).toBe('draft');
  workflowId = workflow.id;
});

test('1.6.3 — Admin publishes workflow', async ({ request }) => {
  // arrange
  const adminApi = new ApiClient(request, adminToken);

  // act
  const res = await adminApi.post<{ status: string; version: number }>(
    `/api/v1/admin/workflows/${workflowId}/publish`,
  );

  // assert
  expect(res.status).toBe('published');
  expect(res.version).toBe(1);
});

// ── Executor tests — fixme until P3.5 is implemented ─────────────────────────

test.fixme(
  '1.6.4 — Trigger event creates workflow_execution row',
  // BLOCKER: P3.5 Workflow Executor not yet implemented.
  // When implemented: simulate conditional release, assert workflow_executions row created.
  async ({ request }) => {
    const adminApi = new ApiClient(request, adminToken);
    const executions = await adminApi.get<Array<{ workflowId: string; state: string }>>(
      `/api/v1/admin/workflows/${workflowId}/executions`,
    );
    expect(executions.length).toBeGreaterThanOrEqual(1);
    expect(executions[0].state).toBe('running');
  },
);

test.fixme(
  '1.6.5 — Notification queued at first node',
  // BLOCKER: P3.5 Workflow Executor not yet implemented.
  async () => {
    // When implemented: check notification_deliveries table for queued notification
  },
);

test.fixme(
  '1.6.6 — Time advance triggers branch evaluation',
  // BLOCKER: P3.5 Workflow Executor not yet implemented.
  async () => {
    // When implemented: use advanceBullMqClock() to skip the 1h wait node
  },
);

test.fixme(
  '1.6.7 — Workflow execution survives crash-restart',
  // BLOCKER: P3.5 Workflow Executor not yet implemented.
  async () => {
    // When implemented: restart app-test container mid-execution, verify resume
  },
);
