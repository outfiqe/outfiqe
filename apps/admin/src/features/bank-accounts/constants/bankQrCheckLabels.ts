import type { QrCheckReasonValue, VerificationMethodValue } from "../api/bankAccountsSchemas";

export const VERIFIED_BADGE_LABEL: Record<VerificationMethodValue, string> = {
  MANUAL: "Verified",
  QR_MATCH: "Verified by QR",
};

export const PENDING_BADGE_LABEL = "Pending verification";

export const QR_NOT_CHECKED_NOTE = "QR not checked: added before automatic QR checks.";

export const QR_CHECK_REASON_NOTE: Record<QrCheckReasonValue, string> = {
  NOT_PAYMENT_QR: "QR check: the photo's QR isn't a bank payment QR.",
  INVALID_CHECKSUM: "QR check: the QR looks damaged or misread. Check the photo by eye.",
  NAME_NOT_FOUND: "QR check: the QR doesn't show a holder name.",
  NAME_DIFFERS: "QR check: the name on the QR differs from the account name.",
  ACCOUNT_NUMBER_NOT_FOUND: "QR check: the typed account number isn't on the QR.",
  READ_FAILED: "QR check: the photo couldn't be read.",
  BANK_NOT_CONFIRMED: "QR check: couldn't confirm the QR is for the bank they picked.",
};
