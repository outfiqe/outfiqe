"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { authApi, type LoginResponse } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import type { BrandRegisterInput } from "../schemas/brandRegister.schema";
import { AuthActionType } from "../types";

export const useBrandRegister = () => {
  const { dispatch } = useAuth();
  const router = useRouter();

  return useMutation<LoginResponse, ApiClientError, BrandRegisterInput>({
    mutationFn: authApi.registerBrand,
    onSuccess: (data) => {
      dispatch({
        type: AuthActionType.AUTH_SUCCESS,
        payload: { user: data.user, accessToken: data.accessToken },
      });

      router.replace("/overview");
    },
  });
};
