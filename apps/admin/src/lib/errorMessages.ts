import { ApiClientError } from "@/lib/apiClient";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) return error.message || FALLBACK_MESSAGE;
  return FALLBACK_MESSAGE;
};
