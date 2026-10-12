import { z } from "zod";

const ownerTypeValues = ["CREATOR", "BUSINESS"] as const;
export const ownerTypeSchema = z.enum(ownerTypeValues);
export type OwnerTypeValue = z.infer<typeof ownerTypeSchema>;

export const verificationMethodSchema = z.enum(["MANUAL", "QR_MATCH"]);
export type VerificationMethodValue = z.infer<typeof verificationMethodSchema>;

export const qrCheckStatusSchema = z.enum(["NOT_CHECKED", "MATCHED", "NEEDS_REVIEW"]);
export type QrCheckStatusValue = z.infer<typeof qrCheckStatusSchema>;

export const qrCheckReasonSchema = z.enum([
  "NOT_PAYMENT_QR",
  "INVALID_CHECKSUM",
  "NAME_NOT_FOUND",
  "NAME_DIFFERS",
  "ACCOUNT_NUMBER_NOT_FOUND",
  "READ_FAILED",
]);
export type QrCheckReasonValue = z.infer<typeof qrCheckReasonSchema>;

export const adminBankAccountSchema = z.object({
  id: z.string(),
  ownerName: z.string(),
  bankName: z.string(),
  accountName: z.string(),
  accountNumberLast4: z.string(),
  branchName: z.string(),
  qrCodeImageUrl: z.string().nullable(),
  isVerified: z.boolean(),
  verifiedAt: z.string().nullable(),
  verificationMethod: verificationMethodSchema.nullable(),
  qrCheckStatus: qrCheckStatusSchema,
  qrCheckReason: qrCheckReasonSchema.nullable(),
  createdAt: z.string(),
});
export type AdminBankAccount = z.infer<typeof adminBankAccountSchema>;

export const revealedBankAccountSchema = z.object({
  accountNumber: z.string(),
});
export type RevealedBankAccount = z.infer<typeof revealedBankAccountSchema>;

const verifiedFilterValues = ["pending", "verified"] as const;
export type VerifiedFilterValue = (typeof verifiedFilterValues)[number];
export const VERIFIED_FILTER_VALUES = verifiedFilterValues;
