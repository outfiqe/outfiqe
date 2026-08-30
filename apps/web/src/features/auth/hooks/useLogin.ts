"use client";

import { isTenantHost } from "@outfiqe/utils";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { authApi, type LoginResponse } from "../api/authApi";
import { useAuth } from "../context/AuthContext";
import type { LoginInput } from "../schemas/login.schema";
import { AuthActionType } from "../types";
import { getDefaultRouteForUser } from "../utils/getDefaultRoute";
import { getSafeRedirect, isAdminAppTarget, resolveLoginDestination } from "../utils/safeRedirect";

const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";

export const useLogin = () => {
  const { dispatch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  return useMutation<LoginResponse, ApiClientError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      const destination = resolveLoginDestination(
        getSafeRedirect(searchParams.get("redirect")),
        getDefaultRouteForUser(data.user),
        isTenantHost(window.location.hostname, TENANT_BASE_DOMAIN),
      );
      const isExternal =
        isAdminAppTarget(destination) ||
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
