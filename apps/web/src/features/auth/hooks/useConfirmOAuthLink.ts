"use client";

import { useMutation } from "@tanstack/react-query";

import { type ApiClientError, setAccessToken } from "@/shared/lib/apiClient";

import { authApi } from "../api/authApi";
import { type ConfirmOAuthLinkInput, oauthApi } from "../api/oauthApi";
import { useAuth } from "../context/AuthContext";
import { AuthActionType, type UserSession } from "../types";

type ConfirmOAuthLinkResult = { accessToken: string; user: UserSession };

export const useConfirmOAuthLink = () => {
  const { dispatch } = useAuth();

  return useMutation<ConfirmOAuthLinkResult, ApiClientError, ConfirmOAuthLinkInput>({
    mutationFn: async (input) => {
      const { accessToken } = await oauthApi.confirmLink(input);
      setAccessToken(accessToken);
      const user = await authApi.getCurrentUser();
      return { accessToken, user };
    },
    onSuccess: ({ user, accessToken }) => {
      dispatch({ type: AuthActionType.AUTH_SUCCESS, payload: { user, accessToken } });
    },
  });
};
