import type {
  WithdrawOwnerType as WithdrawOwnerTypeType,
  WithdrawRequestStatus as WithdrawRequestStatusType,
  WithdrawWindowType as WithdrawWindowTypeType,
} from "@outfiqe/types";
import { z } from "zod";

export const OwnerType = {
  CREATOR: "CREATOR",
  BUSINESS: "BUSINESS",
} as const satisfies Record<string, WithdrawOwnerTypeType>;
export type OwnerTypeValue = (typeof OwnerType)[keyof typeof OwnerType];

export const WindowType = {
  MONTHLY: "MONTHLY",
  WEEKLY: "WEEKLY",
  CUSTOM_DAYS: "CUSTOM_DAYS",
} as const satisfies Record<string, WithdrawWindowTypeType>;

export const RequestStatus = {
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  PAID: "PAID",
  REJECTED: "REJECTED",
} as const satisfies Record<string, WithdrawRequestStatusType>;
export type RequestStatusValue = (typeof RequestStatus)[keyof typeof RequestStatus];

export const withdrawPolicySchema = z.object({
  ownerType: z.enum(OwnerType),
  minAmount: z.number(),
  maxAmount: z.number(),
  windowType: z.enum(WindowType),
  windowValue: z.number(),
  maxAttemptsPerWindow: z.number(),
  cooldownAfterRejectionDays: z.number(),
  processingNoteText: z.string(),
  nextWindowOpensAt: z.string(),
});
export type WithdrawPolicy = z.infer<typeof withdrawPolicySchema>;

export const withdrawEligibilitySchema = z.object({
  windowOpen: z.boolean(),
  nextWindowOpensAt: z.string(),
  attemptsUsed: z.number(),
  attemptsRemaining: z.number(),
  minAmount: z.number(),
  maxAmount: z.number(),
  availableBalance: z.number(),
  hasVerifiedBankAccount: z.boolean(),
  cooldownActive: z.boolean(),
  cooldownEndsAt: z.string().nullable(),
});
export type WithdrawEligibility = z.infer<typeof withdrawEligibilitySchema>;

export const withdrawRequestSchema = z.object({
  id: z.string(),
  ownerType: z.enum(OwnerType),
  amount: z.number(),
  status: z.enum(RequestStatus),
  rejectionReason: z.string().nullable(),
  referenceNote: z.string().nullable(),
  requiresSecondSignOff: z.boolean(),
  createdAt: z.string(),
  reviewedAt: z.string().nullable(),
  paidAt: z.string().nullable(),
});
export type WithdrawRequest = z.infer<typeof withdrawRequestSchema>;

export const withdrawRequestPageSchema = z.object({
  items: z.array(withdrawRequestSchema),
  nextCursor: z.string().nullable(),
});
export type WithdrawRequestPage = z.infer<typeof withdrawRequestPageSchema>;

const MIN_AMOUNT = 1;

export const createWithdrawRequestSchema = z.object({
  bankAccountId: z.string().min(1, "Select a bank account."),
  amount: z.number().int().min(MIN_AMOUNT),
});
export type CreateWithdrawRequestInput = z.infer<typeof createWithdrawRequestSchema>;
