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
