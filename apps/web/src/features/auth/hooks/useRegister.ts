"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type RegisterResponse } from "../api/authApi";
import type { RegisterInput } from "../schemas/register.schema";

// Registering doesn't authenticate — the account needs email verification
// first (see apps/api's register(), which returns { userId } with no
// tokens). RegisterForm swaps to a "check your email" message in place;
// there's nothing to navigate to yet.
export function useRegister() {
  return useMutation<RegisterResponse, ApiClientError, RegisterInput>({
    mutationFn: authApi.register,
  });
}
