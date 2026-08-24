import { z } from "zod";

const ACCOUNT_NAME_MIN = 2;
const ACCOUNT_NAME_MAX = 120;
const ACCOUNT_NUMBER_MIN_DIGITS = 6;
const ACCOUNT_NUMBER_MAX_DIGITS = 20;
const BRANCH_NAME_MIN = 2;
const BRANCH_NAME_MAX = 120;

const accountNumbersMatch = (fields: { accountNumber: string; confirmAccountNumber: string }) =>
  fields.accountNumber === fields.confirmAccountNumber;

const CONFIRM_ACCOUNT_NUMBER_ISSUE = {
  message: "Account numbers do not match.",
  path: ["confirmAccountNumber"],
};

export const bankAccountBodySchema = z
  .object({
    bankId: z.uuid(),
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
  .refine(accountNumbersMatch, CONFIRM_ACCOUNT_NUMBER_ISSUE);

export type BankAccountBody = z.infer<typeof bankAccountBodySchema>;

export const bankAccountIdParamSchema = z.object({ id: z.uuid() });
export type BankAccountIdParam = z.infer<typeof bankAccountIdParamSchema>;
