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
  .refine(accountNumbersMatch, CONFIRM_ACCOUNT_NUMBER_ISSUE);

export type BankAccountBody = z.infer<typeof bankAccountBodySchema>;

export const bankAccountIdParamSchema = z.object({ id: z.uuid() });
export type BankAccountIdParam = z.infer<typeof bankAccountIdParamSchema>;
