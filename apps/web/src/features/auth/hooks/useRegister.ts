"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type RegisterResponse } from "../api/authApi";
import type { RegisterInput } from "../schemas/register.schema";

export const useRegister = () => {
  return useMutation<RegisterResponse, ApiClientError, RegisterInput>({
    mutationFn: authApi.register,
  });
};
