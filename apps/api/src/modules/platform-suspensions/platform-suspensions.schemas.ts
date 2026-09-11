import { z } from "zod";

const MAX_REASON_LENGTH = 500;
const MAX_DURATION_HOURS = 24 * 365;

export const suspendUserBodySchema = z.object({
  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
  durationHours: z.number().int().positive().max(MAX_DURATION_HOURS).optional(),
});

export const banUserBodySchema = z.object({
  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
});

export const targetUserIdParamSchema = z.object({
  userId: z.uuid(),
});

export const targetBrandIdParamSchema = z.object({
  brandId: z.uuid(),
});

export type SuspendUserBody = z.infer<typeof suspendUserBodySchema>;
export type BanUserBody = z.infer<typeof banUserBodySchema>;
export type TargetUserIdParam = z.infer<typeof targetUserIdParamSchema>;
export type TargetBrandIdParam = z.infer<typeof targetBrandIdParamSchema>;
