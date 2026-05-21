import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  campaignType: z.enum(['routine', 'focused', 'incident_response', 'compliance']),
  description: z.string().optional(),
  vehicleScope: z.object({
    vehicleType: z.string().optional(),
    projectId: z.string().uuid().optional(),
    ageYears: z.number().int().positive().optional(),
    vehicleIds: z.array(z.string().uuid()).optional(),
  }).default({}),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  items: z.array(z.object({
    label: z.string().min(1),
    description: z.string().optional(),
    isCritical: z.boolean().default(false),
  })).min(1),
});

export const campaignQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  campaignType: z.string().optional(),
});

export const updateAssignmentSchema = z.object({
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'in_progress', 'skipped']).optional(),
});

export const submitAssignmentSchema = z.object({
  responses: z.array(z.object({
    itemId: z.string().uuid(),
    status: z.enum(['pass', 'fail', 'na']),
    note: z.string().optional(),
    photoUrl: z.string().optional(),
  })).min(1),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
