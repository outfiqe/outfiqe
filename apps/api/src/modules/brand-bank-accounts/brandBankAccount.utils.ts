import type {
  BrandBankAccountWithBankName,
  PublicBrandBankAccount,
} from "./brandBankAccount.types.js";

export const toPublicBrandBankAccount = ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  isDefault,
  isVerified,
}: BrandBankAccountWithBankName): PublicBrandBankAccount => ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  isDefault,
  isVerified,
});
