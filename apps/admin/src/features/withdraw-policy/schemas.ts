import type { WithdrawOwnerType, WithdrawWindowType } from "@outfiqe/types";
import { z } from "zod";

const ownerTypeValues = ["CREATOR", "BUSINESS"] satisfies WithdrawOwnerType[];
export const ownerTypeSchema = z.enum(ownerTypeValues);
export type OwnerTypeValue = z.infer<typeof ownerTypeSchema>;

const windowTypeValues = ["MONTHLY", "WEEKLY", "CUSTOM_DAYS"] satisfies WithdrawWindowType[];
export const windowTypeSchema = z.enum(windowTypeValues);
export type WindowTypeValue = z.infer<typeof windowTypeSchema>;

export const withdrawPolicySchema = z.object({
  ownerType: ownerTypeSchema,
  minAmount: z.number(),
  maxAmount: z.number(),
  windowType: windowTypeSchema,
  windowValue: z.number(),
  maxAttemptsPerWindow: z.number(),
  cooldownAfterRejectionDays: z.number(),
  processingNoteText: z.string(),
  nextWindowOpensAt: z.string(),
});
export type WithdrawPolicy = z.infer<typeof withdrawPolicySchema>;
