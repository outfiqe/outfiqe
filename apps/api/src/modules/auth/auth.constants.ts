import { TokenPurpose } from "#constants/enums/auth.enum.js";

export const PURPOSE_ERROR_COPY: Record<TokenPurpose, { invalid: string; expired: string }> = {
  [TokenPurpose.EMAIL_VERIFICATION]: {
    invalid: "This verification link is invalid or has expired.",
    expired: "This verification link has expired. Please request a new one.",
  },
  [TokenPurpose.PASSWORD_RESET]: {
    invalid: "This reset link is invalid or has expired.",
    expired: "This reset link has expired. Please request a new one.",
  },
};

export const REFRESH_TOKEN_RETENTION_DAYS = 30;
export const AUTH_RETENTION_SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export const FORGOT_PASSWORD_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const FORGOT_PASSWORD_MAX_REQUESTS = 3;

export const RESEND_VERIFICATION_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const RESEND_VERIFICATION_MAX_REQUESTS = 3;

export const LOGIN_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const LOGIN_IP_RATE_LIMIT_MAX_REQUESTS = 20;
export const LOGIN_EMAIL_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const LOGIN_EMAIL_RATE_LIMIT_MAX_REQUESTS = 10;

export const REGISTER_IP_RATE_LIMIT_WINDOW_MS = ONE_HOUR_MS;
export const REGISTER_IP_RATE_LIMIT_MAX_REQUESTS = 5;

export const REFRESH_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const REFRESH_IP_RATE_LIMIT_MAX_REQUESTS = 30;

export const RESET_PASSWORD_IP_RATE_LIMIT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const RESET_PASSWORD_IP_RATE_LIMIT_MAX_REQUESTS = 10;

export const LOGIN_LOCKOUT_WINDOW_MS = FIFTEEN_MINUTES_MS;
export const LOGIN_LOCKOUT_THRESHOLD = 8;
