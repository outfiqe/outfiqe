import type {
  AdminBankAccountView,
  BankAccountWithBankName,
  PublicBankAccount,
} from "./bank-account.types.js";

export const toPublicBankAccount = ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  qrCodeImageUrl,
  isDefault,
  isVerified,
}: BankAccountWithBankName): PublicBankAccount => ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  qrCodeImageUrl,
  isDefault,
  isVerified,
});

type AdminBankAccountRow = BankAccountWithBankName & { ownerName: string };

export const toAdminBankAccountView = ({
  id,
  ownerName,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  qrCodeImageUrl,
  isVerified,
  verifiedAt,
  verificationMethod,
  qrCheckStatus,
  qrCheckReason,
  createdAt,
}: AdminBankAccountRow): AdminBankAccountView => ({
  id,
  ownerName,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  qrCodeImageUrl,
  isVerified,
  verifiedAt: verifiedAt?.toISOString() ?? null,
  verificationMethod,
  qrCheckStatus,
  qrCheckReason,
  createdAt: createdAt.toISOString(),
});
