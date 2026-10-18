import { z } from "zod";

const MIN_CLEAR_REASON_LENGTH = 5;
const MAX_CLEAR_REASON_LENGTH = 500;
const MAX_PHONE_LENGTH = 20;

export const refusalOrderParamSchema = z.object({ orderId: z.uuid() });

export const clearRefusalsSchema = z.object({
  reason: z.string().trim().min(MIN_CLEAR_REASON_LENGTH).max(MAX_CLEAR_REASON_LENGTH),
});

export const codEligibilityQuerySchema = z.object({
  phone: z.string().trim().min(1).max(MAX_PHONE_LENGTH).optional(),
});

export type RefusalOrderParam = z.infer<typeof refusalOrderParamSchema>;
export type ClearRefusalsBody = z.infer<typeof clearRefusalsSchema>;
export type CodEligibilityQuery = z.infer<typeof codEligibilityQuerySchema>;
