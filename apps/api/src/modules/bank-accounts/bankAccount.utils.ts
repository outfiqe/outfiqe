import type {
  AdminBankAccountView,
  BankAccountWithBankName,
  PublicBankAccount,
} from "./bankAccount.types.js";

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
  createdAt: createdAt.toISOString(),
});
