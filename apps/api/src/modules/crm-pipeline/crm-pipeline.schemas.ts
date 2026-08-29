import { z } from "zod";

export const createStageSchema = z.object({
  name: z.string().trim().min(1).max(60),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
});

export const updateStageSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    isWon: z.boolean().optional(),
    isLost: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update.",
  });

export const reorderStagesSchema = z.object({
  orderedStageIds: z.array(z.uuid()).min(1),
});

export const stageIdParamsSchema = z.object({ stageId: z.uuid() });

export const dealIdParamsSchema = z.object({ dealId: z.uuid() });

const dealCoreShape = {
  stageId: z.uuid(),
  title: z.string().trim().min(1).max(140),
  value: z.number().int().min(0).max(1_000_000_000).optional().default(0),
  currency: z.string().trim().min(1).max(8).optional().default("NPR"),
  expectedCloseDate: z.coerce.date().nullable().optional().default(null),
  ownerMembershipId: z.uuid().nullable().optional().default(null),
};

export const createDealSchema = z.object({
  ...dealCoreShape,
  partnerCreatorId: z.uuid(),
});

export const updateDealSchema = z
  .object({
    stageId: z.uuid().optional(),
    title: z.string().trim().min(1).max(140).optional(),
    value: z.number().int().min(0).max(1_000_000_000).optional(),
    currency: z.string().trim().min(1).max(8).optional(),
    expectedCloseDate: z.coerce.date().nullable().optional(),
    ownerMembershipId: z.uuid().nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update.",
  });

export type CreateStageBody = z.infer<typeof createStageSchema>;
export type UpdateStageBody = z.infer<typeof updateStageSchema>;
export type ReorderStagesBody = z.infer<typeof reorderStagesSchema>;
export type StageIdParams = z.infer<typeof stageIdParamsSchema>;
export type DealIdParams = z.infer<typeof dealIdParamsSchema>;
export type CreateDealBody = z.infer<typeof createDealSchema>;
export type UpdateDealBody = z.infer<typeof updateDealSchema>;
