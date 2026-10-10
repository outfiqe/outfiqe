import { z } from "zod";

export const pipelineStageSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  isWon: z.boolean(),
  isLost: z.boolean(),
});
export type PipelineStage = z.infer<typeof pipelineStageSchema>;

export const dealStatusSchema = z.enum(["OPEN", "WON", "LOST"]);
export type DealStatusValue = z.infer<typeof dealStatusSchema>;

export const dealSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  stageId: z.string(),
  stageName: z.string(),
  title: z.string(),
  value: z.number(),
  currency: z.string(),
  expectedCloseDate: z.string().nullable(),
  ownerMembershipId: z.string().nullable(),
  ownerName: z.string().nullable(),
  partnerCreatorId: z.string(),
  partnerName: z.string(),
  partnerHandle: z.string(),
  status: dealStatusSchema,
  closedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Deal = z.infer<typeof dealSchema>;

export const pipelineStageListSchema = z.array(pipelineStageSchema);
export const dealListSchema = z.array(dealSchema);
