import type { BankAccountWithBankName, PublicBankAccount } from "./bankAccount.types.js";

export const toPublicBankAccount = ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  isDefault,
  isVerified,
}: BankAccountWithBankName): PublicBankAccount => ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  isDefault,
  isVerified,
});
