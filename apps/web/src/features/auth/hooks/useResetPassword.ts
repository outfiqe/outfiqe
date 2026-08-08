"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type MessageResponse } from "../api/authApi";
import type { ResetPasswordInput } from "../schemas/resetPassword.schema";

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation<MessageResponse, ApiClientError, ResetPasswordInput>({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      router.replace("/login?reset=1");
    },
  });
};
