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
    accountName: z
      .string()
      .trim()
      .min(ACCOUNT_NAME_MIN, "Enter the account holder's name.")
      .max(
        ACCOUNT_NAME_MAX,
        `Account holder name can't be longer than ${ACCOUNT_NAME_MAX} characters.`,
      ),
    accountNumber: z
      .string()
      .trim()
      .min(
        ACCOUNT_NUMBER_MIN_DIGITS,
        `Account number must be at least ${ACCOUNT_NUMBER_MIN_DIGITS} digits.`,
      )
      .max(
        ACCOUNT_NUMBER_MAX_DIGITS,
        `Account number can't be longer than ${ACCOUNT_NUMBER_MAX_DIGITS} digits.`,
      )
      .regex(/^\d+$/, "Account number must contain digits only."),
    confirmAccountNumber: z.string().trim(),
    branchName: z
      .string()
      .trim()
      .min(BRANCH_NAME_MIN, "Enter the branch name.")
      .max(BRANCH_NAME_MAX, `Branch name can't be longer than ${BRANCH_NAME_MAX} characters.`),
  })
  .refine(accountNumbersMatch, {
    message: "Account numbers do not match.",
    path: ["confirmAccountNumber"],
  });
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
