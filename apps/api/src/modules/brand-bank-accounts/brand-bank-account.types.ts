export type BrandBankAccountRecord = {
  id: string;
  brandId: string;
  bankId: string;
  accountName: string;
  accountNumberCiphertext: string;
  accountNumberLast4: string;
  branchName: string;
  qrCodeImageUrl: string | null;
  isDefault: boolean;
  isVerified: boolean;
  verifiedAt: Date | null;
  firstPayoutCrossCheckedAt: Date | null;
  createdAt: Date;
};

export type BrandBankAccountWithBankName = BrandBankAccountRecord & { bankName: string };

export type PublicBrandBankAccount = {
  id: string;
  bankId: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  branchName: string;
  qrCodeImageUrl: string | null;
  isDefault: boolean;
  isVerified: boolean;
};

export type CreateBrandBankAccountRepositoryInput = {
  brandId: string;
  bankId: string;
  accountName: string;
  accountNumberCiphertext: string;
  accountNumberLast4: string;
  branchName: string;
  qrCodeImageUrl: string;
  isDefault: boolean;
};

export type CreateBrandBankAccountResult = {
  bankAccount: PublicBrandBankAccount;
  nameMismatch: boolean;
};

export type AdminBrandBankAccountView = {
  id: string;
  ownerName: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  branchName: string;
  qrCodeImageUrl: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
};

export type RevealedBrandBankAccount = {
  accountNumber: string;
};
