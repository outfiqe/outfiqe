"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { oauthApi } from "../api/oauthApi";
import type { OAuthProvider } from "../types";
import { LINKED_ACCOUNTS_QUERY_KEY } from "./useLinkedAccounts";

type UnlinkAccountVariables = { provider: OAuthProvider; password?: string };

export const useUnlinkAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, UnlinkAccountVariables>({
    mutationFn: ({ provider, password }) => oauthApi.unlink(provider, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LINKED_ACCOUNTS_QUERY_KEY });
    },
  });
};
