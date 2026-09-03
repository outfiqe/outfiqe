export enum AuthErrorCode {
  USER_EXISTS = "USER_EXISTS",
  PHONE_EXISTS = "PHONE_EXISTS",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  INVALID_CURRENT_PASSWORD = "INVALID_CURRENT_PASSWORD",
  PASSWORD_UNCHANGED = "PASSWORD_UNCHANGED",
  PASSWORD_BREACHED = "PASSWORD_BREACHED",
  NO_PASSWORD_SET = "NO_PASSWORD_SET",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_INVITE = "INVALID_INVITE",
  INVITE_EXPIRED = "INVITE_EXPIRED",
  INVITE_USED = "INVITE_USED",
  CAPTCHA_FAILED = "CAPTCHA_FAILED",
  ONLY_AUTH_METHOD = "ONLY_AUTH_METHOD",
  OAUTH_IDENTITY_ALREADY_LINKED = "OAUTH_IDENTITY_ALREADY_LINKED",
  OAUTH_IDENTITY_NOT_FOUND = "OAUTH_IDENTITY_NOT_FOUND",
  OAUTH_LINK_TOKEN_INVALID = "OAUTH_LINK_TOKEN_INVALID",
  OAUTH_STATE_INVALID = "OAUTH_STATE_INVALID",
  OAUTH_EMAIL_UNVERIFIED = "OAUTH_EMAIL_UNVERIFIED",
  OAUTH_EXCHANGE_FAILED = "OAUTH_EXCHANGE_FAILED",
}

const MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.USER_EXISTS]: "An account with this email already exists.",
  [AuthErrorCode.PHONE_EXISTS]: "An account with this phone number already exists.",
  [AuthErrorCode.INVALID_CREDENTIALS]: "Incorrect email or password.",
  [AuthErrorCode.INVALID_CURRENT_PASSWORD]: "Your current password is incorrect.",
  [AuthErrorCode.PASSWORD_UNCHANGED]:
    "Your new password must be different from your current password.",
  [AuthErrorCode.PASSWORD_BREACHED]:
    "This password has appeared in a data breach. Please choose another.",
  [AuthErrorCode.NO_PASSWORD_SET]:
    "Your account signs in with a connected account. Use the forgot-password link to set a password.",
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: "Please verify your email before signing in.",
  [AuthErrorCode.INVALID_TOKEN]: "This link is invalid or has already been used.",
  [AuthErrorCode.TOKEN_EXPIRED]: "This link has expired. Please request a new one.",
  [AuthErrorCode.INVALID_INVITE]: "This invite link is not valid.",
  [AuthErrorCode.INVITE_EXPIRED]: "This invite link has expired.",
  [AuthErrorCode.INVITE_USED]: "This invite link has already been used.",
  [AuthErrorCode.CAPTCHA_FAILED]: "Please complete the challenge below and try again.",
  [AuthErrorCode.ONLY_AUTH_METHOD]: "Connect another sign-in method before disconnecting this one.",
  [AuthErrorCode.OAUTH_IDENTITY_ALREADY_LINKED]:
    "This account is already connected to a different Outfiqe account.",
  [AuthErrorCode.OAUTH_IDENTITY_NOT_FOUND]: "This provider isn't connected to your account.",
  [AuthErrorCode.OAUTH_LINK_TOKEN_INVALID]:
    "This link confirmation has expired. Please try connecting again.",
  [AuthErrorCode.OAUTH_STATE_INVALID]:
    "This sign-in attempt has expired or was already used. Please try again.",
  [AuthErrorCode.OAUTH_EMAIL_UNVERIFIED]:
    "Your account's email isn't verified with this provider. Please verify it and try again.",
  [AuthErrorCode.OAUTH_EXCHANGE_FAILED]: "Could not complete sign-in. Please try again.",
};

const isKnownAuthErrorCode = (code: string): code is AuthErrorCode => {
  return code in MESSAGES;
};

export const getAuthErrorMessage = (code: string | undefined): string | null => {
  if (!code) return null;
  return isKnownAuthErrorCode(code) ? MESSAGES[code] : "Something went wrong. Please try again.";
};
