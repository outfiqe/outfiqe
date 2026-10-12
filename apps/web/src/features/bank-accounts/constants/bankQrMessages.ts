export const BANK_QR_PREVIEW_NOTES = {
  READING: "Reading your QR…",
  DETAILS_FILLED:
    "We read your QR and filled in what it shows. Check the details before you add it.",
  DETAILS_UNREADABLE:
    "We found a QR code but couldn't read account details from it. You can still add the account, and we'll check it for you.",
  NO_QR_FOUND:
    "We couldn't find a QR code in that photo. Upload a clear photo or screenshot of your bank QR.",
} as const;

export const BANK_ACCOUNT_ADDED_TOASTS = {
  VERIFIED: "Bank account added and verified from your QR.",
  PENDING: "Bank account added. We'll verify it shortly.",
  NAME_MISMATCH:
    "The account holder name doesn't match your profile name — this may slow down verification.",
} as const;
