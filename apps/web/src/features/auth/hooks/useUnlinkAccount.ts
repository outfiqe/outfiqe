"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { oauthApi } from "../api/oauthApi";
import type { OAuthProvider } from "../types";
import { LINKED_ACCOUNTS_QUERY_KEY } from "./useLinkedAccounts";

type UnlinkAccountVariables = { provider: OAuthProvider; password?: string };

export const useUnlinkAccount = () =>
  useApiMutation<void, ApiClientError, UnlinkAccountVariables>({
    mutationFn: ({ provider, password }) => oauthApi.unlink(provider, password),
    invalidateKeys: [LINKED_ACCOUNTS_QUERY_KEY],
  });
