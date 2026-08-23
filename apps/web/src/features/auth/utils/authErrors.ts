export enum AuthErrorCode {
  USER_EXISTS = "USER_EXISTS",
  PHONE_EXISTS = "PHONE_EXISTS",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
  INVALID_TOKEN = "INVALID_TOKEN",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  INVALID_INVITE = "INVALID_INVITE",
  INVITE_EXPIRED = "INVITE_EXPIRED",
  INVITE_USED = "INVITE_USED",
  CAPTCHA_FAILED = "CAPTCHA_FAILED",
}

const MESSAGES: Record<AuthErrorCode, string> = {
  [AuthErrorCode.USER_EXISTS]: "An account with this email already exists.",
  [AuthErrorCode.PHONE_EXISTS]: "An account with this phone number already exists.",
  [AuthErrorCode.INVALID_CREDENTIALS]: "Incorrect email or password.",
  [AuthErrorCode.EMAIL_NOT_VERIFIED]: "Please verify your email before signing in.",
  [AuthErrorCode.INVALID_TOKEN]: "This link is invalid or has already been used.",
  [AuthErrorCode.TOKEN_EXPIRED]: "This link has expired. Please request a new one.",
  [AuthErrorCode.INVALID_INVITE]: "This invite link is not valid.",
  [AuthErrorCode.INVITE_EXPIRED]: "This invite link has expired.",
  [AuthErrorCode.INVITE_USED]: "This invite link has already been used.",
  [AuthErrorCode.CAPTCHA_FAILED]: "Please complete the challenge below and try again.",
};

const isKnownAuthErrorCode = (code: string): code is AuthErrorCode => {
  return code in MESSAGES;
};

export const getAuthErrorMessage = (code: string | undefined): string | null => {
  if (!code) return null;
  return isKnownAuthErrorCode(code) ? MESSAGES[code] : "Something went wrong. Please try again.";
};
