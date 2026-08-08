"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type MessageResponse } from "../api/authApi";

// Shared by two screens: the EMAIL_NOT_VERIFIED banner on /login, and the
// error state on /verify-email.
export function useResendVerification() {
  return useMutation<MessageResponse, ApiClientError, string>({
    mutationFn: (email: string) => authApi.resendVerification(email),
  });
}
