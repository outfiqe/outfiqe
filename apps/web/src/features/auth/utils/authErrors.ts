// Mirrors the `code` values apps/api's AppError throws (see auth.service.ts)
// as a real enum, so components compare against AuthErrorCode.X instead of
// a bare string literal.
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
}

// Maps apps/api's AppError `code` values to user-facing copy in one place.
// Components import this instead of hardcoding strings, so the mapping
// can't drift screen-to-screen.
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
};

// `code` here is untyped `string` on purpose — it comes off the wire
// (ApiClientError.code), so it isn't known at compile time to actually be
// an AuthErrorCode. Only the lookup table's keys are the enum.
function isKnownAuthErrorCode(code: string): code is AuthErrorCode {
  return code in MESSAGES;
}

export function getAuthErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return isKnownAuthErrorCode(code) ? MESSAGES[code] : "Something went wrong. Please try again.";
}
