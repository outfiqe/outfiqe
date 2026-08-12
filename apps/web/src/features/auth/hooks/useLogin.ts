"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";
import { authApi, type LoginResponse } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import { AuthActionType } from "../types";
import { ADMIN_URL, getDefaultRouteForUser } from "../utils/getDefaultRoute";
import { getSafeRedirect } from "../utils/safeRedirect";
import type { LoginInput } from "../schemas/login.schema";

export const useLogin = () => {
  const { dispatch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation<LoginResponse, ApiClientError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const requested = getSafeRedirect(searchParams.get("redirect"));
      const destination = requested ?? getDefaultRouteForUser(data.user);
      const isExternal =
        destination === ADMIN_URL ||
        (destination.startsWith("http") && !destination.startsWith(window.location.origin));

      if (isExternal) {
        window.location.replace(destination);
        return;
      }

      dispatch({
        type: AuthActionType.AUTH_SUCCESS,
        payload: { user: data.user, accessToken: data.accessToken },
      });
      router.replace(destination);
    },
  });
};
