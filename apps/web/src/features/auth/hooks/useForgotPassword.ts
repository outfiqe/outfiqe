"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { authApi, type MessageResponse } from "../api/authApi";
import type { ForgotPasswordInput } from "../schemas/forgotPassword.schema";

export const useForgotPassword = () => {
  return useMutation<MessageResponse, ApiClientError, ForgotPasswordInput>({
    mutationFn: authApi.forgotPassword,
  });
};
