import type {
  AdminBrandBankAccountView,
  BrandBankAccountWithBankName,
  PublicBrandBankAccount,
} from "./brand-bank-account.types.js";

export const toPublicBrandBankAccount = ({
  id,
  bankId,
  bankName,
  accountName,
  accountNumberLast4,
  branchName,
  qrCodeImageUrl,
  isDefault,
  isVerified,
}: BrandBankAccountWithBankName): PublicBrandBankAccount => ({
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

type AdminBrandBankAccountRow = BrandBankAccountWithBankName & { ownerName: string };

export const toAdminBrandBankAccountView = ({
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
}: AdminBrandBankAccountRow): AdminBrandBankAccountView => ({
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
