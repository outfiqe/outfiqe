"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { authApi, type MessageResponse } from "../api/authApi";
import type { ChangePasswordInput } from "../schemas/changePassword.schema";

export const useChangePassword = () =>
  useMutation<MessageResponse, ApiClientError, ChangePasswordInput>({
    mutationFn: authApi.changePassword,
  });
