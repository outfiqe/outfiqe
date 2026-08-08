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

export function useLogin() {
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
      // replace(), not push() — a signed-in user hitting back shouldn't
      // land on the login form again.
      router.replace(requested ?? getDefaultRouteForUser(data.user));
    },
    // No onError UI here on purpose — the component reads mutation.error
    // and decides how to show it (inline vs banner). Keeps this hook
    // testable without a UI layer.
  });
}
