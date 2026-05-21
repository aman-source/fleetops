/**
 * Seed script — run with: pnpm tsx src/infra/db/seed.ts
 * Creates AR Technology org hierarchy, roles, and test users.
 */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import bcrypt from 'bcryptjs';
import { organizations } from './schema/organizations.js';
import { roles } from './schema/roles.js';
import { users } from './schema/users.js';
import { workflows, workflowVersions } from './schema/workflows.js';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://fleetops:fleetops_secret@localhost:5432/fleetops';

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

// ── Permission Sets ──
const PERMISSIONS = {
  admin: ['*'],
  gm: [
    'analytics:read', 'fleet:read', 'journey:read', 'journey:approve',
    'maintenance:read', 'hse:read', 'passenger:read', 'documents:read',
    'workflow:read', 'audit:read', 'notifications:read',
  ],
  journey_manager: [
    'journey:create', 'journey:read', 'journey:update', 'journey:submit', 'journey:approve',
    'fleet:read', 'passenger:read', 'passenger:pool', 'documents:read', 'notifications:read',
    'analytics:read',
  ],
  hse: [
    'hse:read', 'hse:update', 'hse:approve', 'incident:read', 'incident:update', 'incident:close',
    'journey:read', 'journey:approve', 'fleet:read', 'maintenance:read',
    'documents:read', 'notifications:read', 'audit:read', 'analytics:read',
  ],
  maintenance: [
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:release',
    'fleet:read', 'fleet:update', 'documents:read', 'documents:create',
    'notifications:read', 'analytics:read',
  ],
  driver: [
    'journey:read', 'journey:activate', 'journey:close',
    'fleet:read', 'documents:read', 'notifications:read',
  ],
  planner: [
    'passenger:read', 'passenger:create', 'passenger:update', 'passenger:pool',
    'journey:create', 'journey:read', 'fleet:read', 'notifications:read',
  ],
  storekeeper: [
    'maintenance:read', 'maintenance:parts', 'fleet:read', 'notifications:read',
  ],
  passenger: [
    'passenger:request', 'passenger:read', 'notifications:read',
  ],
};

async function seed() {
  console.log('Seeding Fleetops database...\n');

  // ── Organizations ──
  console.log('Creating organizations...');
  const [arTech] = await db.insert(organizations).values({
    name: 'AR Technology',
    type: 'company',
    config: { country: 'OM', currency: 'OMR', timezone: 'Asia/Muscat' },
  }).returning();

  const [opsDiv] = await db.insert(organizations).values({
    name: 'Operations Division',
    type: 'department',
    parentId: arTech.id,
  }).returning();

  const [marmulProject] = await db.insert(organizations).values({
    name: 'Marmul Operations',
    type: 'project',
    parentId: opsDiv.id,
  }).returning();

  const [nimrProject] = await db.insert(organizations).values({
    name: 'Nimr-2 Operations',
    type: 'project',
    parentId: opsDiv.id,
  }).returning();

  const [marmulSite] = await db.insert(organizations).values({
    name: 'Marmul Base Camp',
    type: 'site',
    parentId: marmulProject.id,
  }).returning();

  const [marmulWorkshop] = await db.insert(organizations).values({
    name: 'Marmul Workshop',
    type: 'workshop',
    parentId: marmulProject.id,
  }).returning();

  console.log(`  Created: ${arTech.name}, ${marmulProject.name}, ${nimrProject.name}, ${marmulSite.name}, ${marmulWorkshop.name}`);

  // ── Roles ──
  console.log('Creating roles...');
  const roleRecords: Record<string, { id: string }> = {};

  for (const [roleName, permissions] of Object.entries(PERMISSIONS)) {
    const [role] = await db.insert(roles).values({
      name: roleName,
      permissions,
      orgId: arTech.id,
    }).returning();
    roleRecords[roleName] = role;
  }
  console.log(`  Created ${Object.keys(roleRecords).length} roles`);

  // ── Users ──
  console.log('Creating users...');
  const defaultPassword = await bcrypt.hash('Fleetops@2026', 12);

  const testUsers = [
    { name: 'Ahmad Al-Balushi', email: 'admin@artech.om', roleKey: 'admin', orgId: arTech.id },
    { name: 'Khalid Al-Habsi', email: 'gm@artech.om', roleKey: 'gm', orgId: arTech.id },
    { name: 'Said Al-Rawahi', email: 'jm@artech.om', roleKey: 'journey_manager', orgId: marmulProject.id },
    { name: 'Fatma Al-Zadjali', email: 'hse@artech.om', roleKey: 'hse', orgId: marmulProject.id },
    { name: 'Yusuf Al-Kindi', email: 'maint@artech.om', roleKey: 'maintenance', orgId: marmulWorkshop.id },
    { name: 'Salim Al-Harthi', email: 'driver1@artech.om', roleKey: 'driver', orgId: marmulProject.id },
    { name: 'Mohammed Al-Riyami', email: 'driver2@artech.om', roleKey: 'driver', orgId: nimrProject.id },
    { name: 'Aisha Al-Busaidi', email: 'planner@artech.om', roleKey: 'planner', orgId: marmulProject.id },
    { name: 'Hassan Al-Shukaili', email: 'store@artech.om', roleKey: 'storekeeper', orgId: marmulWorkshop.id },
    { name: 'Maryam Al-Lawati', email: 'pax@artech.om', roleKey: 'passenger', orgId: marmulProject.id },
  ];

  for (const u of testUsers) {
    await db.insert(users).values({
      name: u.name,
      email: u.email,
      passwordHash: defaultPassword,
      phone: '+968 9' + Math.floor(1000000 + Math.random() * 9000000).toString(),
      roleId: roleRecords[u.roleKey].id,
      orgId: u.orgId,
    });
  }
  console.log(`  Created ${testUsers.length} users (password: Fleetops@2026)`);

  // ── Workflows (pre-seeded for admin-workflow-config E2E test) ──
  console.log('Creating pre-seeded workflows...');
  const seedWorkflows = [
    {
      name: 'journey_approval',
      key: 'JM-APPROVAL',
      description: 'Journey Manager approval chain',
      nodes: [
        { id: 'approval-1', type: 'approval', config: { role: 'journey_manager' }, position: { x: 100, y: 100 } },
        { id: 'notify-1', type: 'notification', config: { recipients: ['journey_manager', 'hse'] }, position: { x: 300, y: 100 } },
      ],
      edges: [{ from: 'approval-1', to: 'notify-1' }],
    },
    {
      name: 'vehicle_release',
      key: 'VEH-RELEASE',
      description: 'Vehicle maintenance release workflow',
      nodes: [
        { id: 'gate-1', type: 'gate', config: { check: 'hse_cosign' }, position: { x: 100, y: 100 } },
        { id: 'approval-1', type: 'approval', config: { role: 'hse' }, position: { x: 300, y: 100 } },
        { id: 'notify-1', type: 'notification', config: { recipients: ['maintenance', 'journey_manager'] }, position: { x: 500, y: 100 } },
      ],
      edges: [{ from: 'gate-1', to: 'approval-1' }, { from: 'approval-1', to: 'notify-1' }],
    },
  ];

  for (const wf of seedWorkflows) {
    const [workflow] = await db.insert(workflows).values({
      name: wf.name,
      key: wf.key,
      currentVersion: 1,
      orgId: arTech.id,
    }).returning();

    await db.insert(workflowVersions).values({
      workflowId: workflow.id,
      version: 1,
      status: 'published',
      nodes: wf.nodes,
      edges: wf.edges,
      publishedAt: new Date(),
    });
  }
  console.log(`  Created ${seedWorkflows.length} pre-seeded workflows`);

  console.log('\nSeed complete.');
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
