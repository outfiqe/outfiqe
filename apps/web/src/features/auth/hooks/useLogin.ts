"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type LoginResponse } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { AuthActionType } from "../types";
import { getDefaultRouteForUser } from "../utils/getDefaultRoute";
import { getSafeRedirect } from "../utils/safeRedirect";
import type { LoginInput } from "../schemas/login.schema";

export const useLogin = () => {
  const { dispatch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation<LoginResponse, ApiClientError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      dispatch({
        type: AuthActionType.AUTH_SUCCESS,
        payload: { user: data.user, accessToken: data.accessToken },
      });

      const requested = getSafeRedirect(searchParams.get("redirect"));

      router.replace(requested ?? getDefaultRouteForUser(data.user));
    },
  });
};
