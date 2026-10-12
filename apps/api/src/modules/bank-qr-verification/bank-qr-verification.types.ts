import type {
  BankAccountVerificationMethod,
  BankQrCheckReason,
  BankQrCheckStatus,
} from "#generated/prisma/enums.js";

import type { BANK_QR_FORMAT, BANK_QR_REJECTION } from "./bank-qr-verification.constants.js";

export type EmvMerchantAccountTemplate = {
  templateTag: string;
  subFields: ReadonlyMap<string, string>;
};

export type ParsedEmvPayload = {
  merchantName: string | null;
  merchantAccountTemplates: EmvMerchantAccountTemplate[];
  hasValidChecksum: boolean;
};

export type ConfirmedQrAccountFieldLocation = {
  operatorGuid: string;
  accountNumberSubTag: string;
  bankCodeSubTag?: string;
};

export type BankQrTypedDetails = {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  bankSwiftCode: string | null;
};

export type BankAccountQrDetails = {
  accountName: string;
  accountNumber: string;
  bankSwiftCode: string | null;
};

export type ReadBankQr =
  | { format: typeof BANK_QR_FORMAT.EMV; emvPayload: ParsedEmvPayload }
  | { format: typeof BANK_QR_FORMAT.ACCOUNT_JSON; accountDetails: BankAccountQrDetails };

export type BankQrRejection = (typeof BANK_QR_REJECTION)[keyof typeof BANK_QR_REJECTION];

export type BankQrCheckForSave = {
  qrCheckStatus: BankQrCheckStatus;
  qrCheckReason: BankQrCheckReason | null;
};

export type BankQrMatchResult =
  { isRejected: true; rejection: BankQrRejection } | ({ isRejected: false } & BankQrCheckForSave);

export type QrDecodePass = {
  maxDimensionPx: number;
  shouldNormaliseContrast: boolean;
};

export type BankQrPreview = {
  isQrDetected: boolean;
  accountName: string | null;
  accountNumber: string | null;
};

export type BankAccountQrCheckFields = BankQrCheckForSave & {
  qrCheckedAt: Date;
  isVerified: boolean;
  verifiedAt: Date | null;
  verificationMethod: BankAccountVerificationMethod | null;
};
