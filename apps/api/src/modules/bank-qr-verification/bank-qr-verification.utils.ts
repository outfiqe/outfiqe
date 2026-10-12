import { BankAccountVerificationMethod, BankQrCheckStatus } from "#generated/prisma/enums.js";

import type { BankAccountQrCheckFields, BankQrCheckForSave } from "./bank-qr-verification.types.js";

export const toBankAccountQrCheckFields = (
  { qrCheckStatus, qrCheckReason }: BankQrCheckForSave,
  checkedAt: Date,
): BankAccountQrCheckFields => {
  const isQrMatched = qrCheckStatus === BankQrCheckStatus.MATCHED;
  return {
    qrCheckStatus,
    qrCheckReason,
    qrCheckedAt: checkedAt,
    isVerified: isQrMatched,
    verifiedAt: isQrMatched ? checkedAt : null,
    verificationMethod: isQrMatched ? BankAccountVerificationMethod.QR_MATCH : null,
  };
};
