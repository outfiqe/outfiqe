"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type MessageResponse } from "../api/authApi";
import type { ResetPasswordInput } from "../schemas/resetPassword.schema";

export function useResetPassword() {
  const router = useRouter();

  return useMutation<MessageResponse, ApiClientError, ResetPasswordInput>({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      // apps/api's resetPassword() also revokes every refresh token for the
      // account, so there's no session to land the user in — back to login,
      // which reads ?reset=1 to show a confirmation banner.
      router.replace("/login?reset=1");
    },
  });
}
