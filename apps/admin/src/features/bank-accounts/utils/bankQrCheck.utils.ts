import type { AdminBankAccount } from "../api/bankAccountsSchemas";
import {
  PENDING_BADGE_LABEL,
  QR_CHECK_REASON_NOTE,
  QR_NOT_CHECKED_NOTE,
  VERIFIED_BADGE_LABEL,
} from "../constants/bankQrCheckLabels";

type VerificationFields = Pick<AdminBankAccount, "isVerified" | "verificationMethod">;
type QrCheckFields = Pick<AdminBankAccount, "isVerified" | "qrCheckStatus" | "qrCheckReason">;

export const describeVerificationBadge = ({
  isVerified,
  verificationMethod,
}: VerificationFields): string => {
  if (!isVerified) return PENDING_BADGE_LABEL;
  return VERIFIED_BADGE_LABEL[verificationMethod ?? "MANUAL"];
};

export const describeQrCheckNote = ({
  isVerified,
  qrCheckStatus,
  qrCheckReason,
}: QrCheckFields): string | null => {
  if (isVerified) return null;
  if (qrCheckStatus === "NOT_CHECKED") return QR_NOT_CHECKED_NOTE;
  return qrCheckReason ? QR_CHECK_REASON_NOTE[qrCheckReason] : null;
};
