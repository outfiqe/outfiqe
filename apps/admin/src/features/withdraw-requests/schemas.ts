import type { WithdrawOwnerType, WithdrawRequestStatus } from "@outfiqe/types";
import { z } from "zod";

const ownerTypeValues = ["CREATOR", "BUSINESS"] satisfies WithdrawOwnerType[];
export const ownerTypeSchema = z.enum(ownerTypeValues);
export type OwnerTypeValue = z.infer<typeof ownerTypeSchema>;

const statusValues = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "PAID",
  "REJECTED",
] satisfies WithdrawRequestStatus[];
export const withdrawRequestStatusSchema = z.enum(statusValues);
export type WithdrawRequestStatusValue = z.infer<typeof withdrawRequestStatusSchema>;

export const adminWithdrawRequestSchema = z.object({
  id: z.string(),
  ownerType: ownerTypeSchema,
  ownerName: z.string(),
  bankAccountLast4: z.string(),
  amount: z.number(),
  status: withdrawRequestStatusSchema,
  rejectionReason: z.string().nullable(),
  referenceNote: z.string().nullable(),
  requiresSecondSignOff: z.boolean(),
  firstApprovedById: z.string().nullable(),
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
});
export type AdminWithdrawRequest = z.infer<typeof adminWithdrawRequestSchema>;
