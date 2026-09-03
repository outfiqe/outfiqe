import { ApiClientError } from "@/shared/lib/apiClient";
import { HeicConversionError } from "@/shared/lib/heicImage";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

// Codes that cut across features (auth/validation/rate-limiting/server errors).
// Feature-specific codes are better served by the backend's own message —
// see apps/api's AppError call sites — which is already written for end users.
const GENERIC_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Please check your input and try again.",
  RATE_LIMITED: "Too many attempts. Please wait a moment and try again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  INTERNAL_ERROR: "Something went wrong on our end. Please try again.",
};

/** Maps any thrown error to a user-facing message, preferring the backend's own
 *  (already human-readable) message over a hardcoded generic one where available. */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof HeicConversionError) {
    return error.message;
  }
  if (error instanceof ApiClientError) {
    return GENERIC_MESSAGES[error.code] ?? error.message ?? FALLBACK_MESSAGE;
  }
  return FALLBACK_MESSAGE;
};
