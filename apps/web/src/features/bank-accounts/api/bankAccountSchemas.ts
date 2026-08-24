import type { WithdrawOwnerType as WithdrawOwnerTypeType } from "@outfiqe/types";
import { z } from "zod";

export const OwnerType = {
  CREATOR: "CREATOR",
  BUSINESS: "BUSINESS",
} as const satisfies Record<string, WithdrawOwnerTypeType>;
export type OwnerTypeValue = (typeof OwnerType)[keyof typeof OwnerType];

export const bankAccountSchema = z.object({
  id: z.string(),
  bankId: z.string(),
  bankName: z.string(),
  accountName: z.string(),
  accountNumberLast4: z.string(),
  branchName: z.string(),
  isDefault: z.boolean(),
  isVerified: z.boolean(),
});
export type BankAccount = z.infer<typeof bankAccountSchema>;

export const bankAccountListSchema = z.array(bankAccountSchema);

export const createBankAccountResultSchema = z.object({
  bankAccount: bankAccountSchema,
  nameMismatch: z.boolean(),
});
export type CreateBankAccountResult = z.infer<typeof createBankAccountResultSchema>;

const ACCOUNT_NAME_MIN = 2;
const ACCOUNT_NAME_MAX = 120;
const ACCOUNT_NUMBER_MIN_DIGITS = 6;
const ACCOUNT_NUMBER_MAX_DIGITS = 20;
const BRANCH_NAME_MIN = 2;
const BRANCH_NAME_MAX = 120;

const accountNumbersMatch = (fields: { accountNumber: string; confirmAccountNumber: string }) =>
  fields.accountNumber === fields.confirmAccountNumber;

export const addBankAccountSchema = z
  .object({
    bankId: z.string().min(1, "Select a bank."),
    accountName: z.string().trim().min(ACCOUNT_NAME_MIN).max(ACCOUNT_NAME_MAX),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d+$/, "Account number must contain digits only.")
      .min(ACCOUNT_NUMBER_MIN_DIGITS)
      .max(ACCOUNT_NUMBER_MAX_DIGITS),
    confirmAccountNumber: z.string().trim(),
    branchName: z.string().trim().min(BRANCH_NAME_MIN).max(BRANCH_NAME_MAX),
  })
  .refine(accountNumbersMatch, {
    message: "Account numbers do not match.",
    path: ["confirmAccountNumber"],
  });
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
