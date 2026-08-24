import { z } from "zod";

import {
  WithdrawOwnerType,
  WithdrawRequestStatus,
  WithdrawWindowType,
} from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MIN_AMOUNT = 1;
const REASON_MAX = 500;
const REFERENCE_NOTE_MAX = 300;
const PROCESSING_NOTE_MAX = 300;
const WINDOW_VALUE_MIN = 1;
const ATTEMPTS_MIN = 1;
const COOLDOWN_DAYS_MIN = 0;

export const ownerTypeQuerySchema = z.object({
  ownerType: z.enum(WithdrawOwnerType),
});
export type OwnerTypeQuery = z.infer<typeof ownerTypeQuerySchema>;

export const createWithdrawRequestSchema = z.object({
  ownerType: z.enum(WithdrawOwnerType),
  bankAccountId: z.uuid(),
  amount: z.number().int().min(MIN_AMOUNT),
});
export type CreateWithdrawRequestBody = z.infer<typeof createWithdrawRequestSchema>;

export const listWithdrawRequestsQuerySchema = z.object({
  ownerType: z.enum(WithdrawOwnerType),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListWithdrawRequestsQuery = z.infer<typeof listWithdrawRequestsQuerySchema>;

export const withdrawRequestIdParamSchema = z.object({ id: z.uuid() });
export type WithdrawRequestIdParam = z.infer<typeof withdrawRequestIdParamSchema>;

export const listAdminWithdrawRequestsQuerySchema = z.object({
  status: z.enum(WithdrawRequestStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type ListAdminWithdrawRequestsQuery = z.infer<typeof listAdminWithdrawRequestsQuerySchema>;

export const approveWithdrawRequestSchema = z.object({
  identityCrossCheckConfirmed: z.boolean().optional(),
});
export type ApproveWithdrawRequestBody = z.infer<typeof approveWithdrawRequestSchema>;

export const rejectWithdrawRequestSchema = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX),
});
export type RejectWithdrawRequestBody = z.infer<typeof rejectWithdrawRequestSchema>;

export const markWithdrawRequestPaidSchema = z.object({
  referenceNote: z.string().trim().min(1).max(REFERENCE_NOTE_MAX),
});
export type MarkWithdrawRequestPaidBody = z.infer<typeof markWithdrawRequestPaidSchema>;

export const updateWithdrawPolicySchema = z
  .object({
    ownerType: z.enum(WithdrawOwnerType),
    minAmount: z.number().int().nonnegative(),
    maxAmount: z.number().int().positive(),
    windowType: z.enum(WithdrawWindowType),
    windowValue: z.number().int().min(WINDOW_VALUE_MIN),
    maxAttemptsPerWindow: z.number().int().min(ATTEMPTS_MIN),
    cooldownAfterRejectionDays: z.number().int().min(COOLDOWN_DAYS_MIN),
    processingNoteText: z.string().trim().min(1).max(PROCESSING_NOTE_MAX),
  })
  .refine((policy) => policy.maxAmount > policy.minAmount, {
    message: "Max amount must be greater than min amount.",
    path: ["maxAmount"],
  });
export type UpdateWithdrawPolicyBody = z.infer<typeof updateWithdrawPolicySchema>;
