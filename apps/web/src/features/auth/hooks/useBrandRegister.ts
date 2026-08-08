"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type LoginResponse } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { AuthActionType } from "../types";
import type { BrandRegisterInput } from "../schemas/brandRegister.schema";

// Unlike customer registration, this *does* authenticate immediately — the
// invite already proved the email, so apps/api's registerBrand() issues
// tokens straight away (see auth.service.ts: emailVerified: true).
export function useBrandRegister() {
  const { dispatch } = useAuth();
  const router = useRouter();

  return useMutation<LoginResponse, ApiClientError, BrandRegisterInput>({
    mutationFn: authApi.registerBrand,
    onSuccess: (data) => {
      dispatch({
        type: AuthActionType.AUTH_SUCCESS,
        payload: { user: data.user, accessToken: data.accessToken },
      });
      // Always /dashboard — registerBrand() only ever returns a BRAND_OWNER.
      router.replace("/dashboard");
    },
  });
}
