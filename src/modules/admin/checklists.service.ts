import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../../infra/db/client.js';
import { checklistTemplates, checklistItems } from '../../infra/db/schema/checklists.js';
import { vehicles } from '../../infra/db/schema/vehicles.js';
import { NotFoundError, ConflictError } from '../../shared/errors.js';

// Default 18-item checklist from mobile app
const DEFAULT_ITEMS = [
  { category: 'Exterior', label: 'Lights & indicators functional', stepNumber: 1, isCritical: true },
  { category: 'Exterior', label: 'Tyres — pressure & condition', stepNumber: 2, isCritical: true },
  { category: 'Exterior', label: 'Windscreen — no cracks', stepNumber: 3, isCritical: true },
  { category: 'Exterior', label: 'Mirrors — adjusted & intact', stepNumber: 4, isCritical: false },
  { category: 'Exterior', label: 'Bodywork — no damage affecting safety', stepNumber: 5, isCritical: false },
  { category: 'Engine', label: 'Engine oil level', stepNumber: 6, isCritical: true },
  { category: 'Engine', label: 'Coolant level', stepNumber: 7, isCritical: true },
  { category: 'Engine', label: 'Brake fluid level', stepNumber: 8, isCritical: true },
  { category: 'Engine', label: 'Battery terminals', stepNumber: 9, isCritical: false },
  { category: 'Engine', label: 'No warning lights on dashboard', stepNumber: 10, isCritical: true },
  { category: 'Safety', label: 'Seatbelts — all functional', stepNumber: 11, isCritical: true },
  { category: 'Safety', label: 'Fire extinguisher — present & charged', stepNumber: 12, isCritical: true },
  { category: 'Safety', label: 'First aid kit — present & stocked', stepNumber: 13, isCritical: false },
  { category: 'Safety', label: 'Reflective triangle / flares', stepNumber: 14, isCritical: false },
  { category: 'Safety', label: 'Panic button — functional', stepNumber: 15, isCritical: true },
  { category: 'IVMS', label: 'IVMS device powered & synced', stepNumber: 16, isCritical: true },
  { category: 'IVMS', label: 'GPS signal confirmed', stepNumber: 17, isCritical: false },
  { category: 'Documents', label: 'Vehicle documents on board', stepNumber: 18, isCritical: true },
];

export async function listTemplates(orgId: string) {
  return db.select().from(checklistTemplates)
    .where(and(eq(checklistTemplates.orgId, orgId), isNull(checklistTemplates.deletedAt)))
    .orderBy(desc(checklistTemplates.createdAt));
}

export async function getTemplate(orgId: string, templateId: string) {
  const rows = await db.select().from(checklistTemplates)
    .where(and(eq(checklistTemplates.id, templateId), eq(checklistTemplates.orgId, orgId), isNull(checklistTemplates.deletedAt)))
    .limit(1);
  if (!rows[0]) throw new NotFoundError('ChecklistTemplate', templateId);

  const items = await db.select().from(checklistItems)
    .where(eq(checklistItems.templateId, templateId))
    .orderBy(checklistItems.sortOrder, checklistItems.stepNumber);

  return { ...rows[0], items };
}

export async function createTemplate(orgId: string, userId: string, input: {
  name: string; projectId?: string;
}) {
  const [template] = await db.insert(checklistTemplates).values({
    name: input.name,
    orgId,
    projectId: input.projectId,
    createdBy: userId,
    status: 'draft',
  }).returning();
  return template;
}

export async function updateTemplate(orgId: string, templateId: string, input: {
  name?: string; items?: Array<{
    stepNumber: number; category: string; label: string;
    description?: string; requiresPhoto?: boolean; isCritical?: boolean; sortOrder?: number;
  }>;
}) {
  const existing = await getTemplate(orgId, templateId);
  if (existing.status !== 'draft') throw new ConflictError('Can only edit draft templates');

  if (input.name) {
    await db.update(checklistTemplates).set({ name: input.name, updatedAt: new Date() })
      .where(eq(checklistTemplates.id, templateId));
  }

  if (input.items) {
    // Replace all items
    await db.delete(checklistItems).where(eq(checklistItems.templateId, templateId));
    if (input.items.length > 0) {
      await db.insert(checklistItems).values(
        input.items.map(item => ({ ...item, templateId }))
      );
    }
  }

  return getTemplate(orgId, templateId);
}

export async function publishTemplate(orgId: string, templateId: string) {
  const existing = await getTemplate(orgId, templateId);
  if (existing.status === 'published') throw new ConflictError('Already published');

  // Archive previous published template for same org+project
  await db.update(checklistTemplates).set({ status: 'archived', updatedAt: new Date() })
    .where(and(
      eq(checklistTemplates.orgId, orgId),
      eq(checklistTemplates.status, 'published'),
    ));

  const [updated] = await db.update(checklistTemplates).set({
    status: 'published',
    publishedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(checklistTemplates.id, templateId)).returning();

  return updated;
}

export async function getVehicleChecklistTemplate(vehicleId: string) {
  // Fetch the vehicle to get orgId + projectId
  const vRows = await db.select({ orgId: vehicles.orgId, projectId: vehicles.projectId })
    .from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);

  if (!vRows[0]) throw new NotFoundError('Vehicle', vehicleId);
  const { orgId, projectId } = vRows[0];

  // Try project-specific template first, then org-wide
  let template = null;
  if (projectId) {
    const rows = await db.select().from(checklistTemplates)
      .where(and(
        eq(checklistTemplates.orgId, orgId),
        eq(checklistTemplates.projectId, projectId),
        eq(checklistTemplates.status, 'published'),
        isNull(checklistTemplates.deletedAt),
      ))
      .orderBy(desc(checklistTemplates.publishedAt))
      .limit(1);
    template = rows[0] ?? null;
  }

  if (!template) {
    const rows = await db.select().from(checklistTemplates)
      .where(and(
        eq(checklistTemplates.orgId, orgId),
        eq(checklistTemplates.status, 'published'),
        isNull(checklistTemplates.deletedAt),
      ))
      .orderBy(desc(checklistTemplates.publishedAt))
      .limit(1);
    template = rows[0] ?? null;
  }

  if (!template) {
    // Return built-in default
    return { id: null, name: 'Default Checklist', items: DEFAULT_ITEMS };
  }

  const items = await db.select().from(checklistItems)
    .where(eq(checklistItems.templateId, template.id))
    .orderBy(checklistItems.sortOrder, checklistItems.stepNumber);

  return { ...template, items };
}
