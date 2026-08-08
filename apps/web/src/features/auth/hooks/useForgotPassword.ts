"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type MessageResponse } from "../api/authApi";
import type { ForgotPasswordInput } from "../schemas/forgotPassword.schema";

// No navigation — the form swaps to a static "check your email" message in
// place, and always shows it (the API returns 200 whether or not the email
// is registered, to avoid leaking which emails have accounts).
export function useForgotPassword() {
  return useMutation<MessageResponse, ApiClientError, ForgotPasswordInput>({
    mutationFn: authApi.forgotPassword,
  });
}
