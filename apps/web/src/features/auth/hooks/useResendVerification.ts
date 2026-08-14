"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { authApi, type MessageResponse } from "../api/authApi";

export const useResendVerification = () => {
  return useMutation<MessageResponse, ApiClientError, string>({
    mutationFn: (email: string) => authApi.resendVerification(email),
  });
};
