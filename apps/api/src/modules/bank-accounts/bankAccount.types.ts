export type BankAccountRecord = {
  id: string;
  userId: string;
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

export type BankAccountWithBankName = BankAccountRecord & { bankName: string };

export type PublicBankAccount = {
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

export type CreateBankAccountRepositoryInput = {
  userId: string;
  bankId: string;
  accountName: string;
  accountNumberCiphertext: string;
  accountNumberLast4: string;
  branchName: string;
  qrCodeImageUrl: string;
  isDefault: boolean;
};

export type CreateBankAccountResult = {
  bankAccount: PublicBankAccount;
  nameMismatch: boolean;
};

export type AdminBankAccountView = {
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

export type RevealedBankAccount = {
  accountNumber: string;
};
