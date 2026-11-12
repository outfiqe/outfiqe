import type { BankAccount } from "@/features/bank-accounts";

const NO_PRESELECTED_ACCOUNT = "";
const SINGLE_ACCOUNT_COUNT = 1;
const ONLY_ACCOUNT_INDEX = 0;

export const pickPreselectedBankAccountId = (verifiedBankAccounts: BankAccount[]): string => {
  const defaultAccount = verifiedBankAccounts.find((bankAccount) => bankAccount.isDefault);
  if (defaultAccount) return defaultAccount.id;

  const hasOnlyOneAccount = verifiedBankAccounts.length === SINGLE_ACCOUNT_COUNT;
  return hasOnlyOneAccount
    ? (verifiedBankAccounts[ONLY_ACCOUNT_INDEX]?.id ?? NO_PRESELECTED_ACCOUNT)
    : NO_PRESELECTED_ACCOUNT;
};
