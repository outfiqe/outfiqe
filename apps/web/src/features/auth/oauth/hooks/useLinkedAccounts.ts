"use client";

import { useQuery } from "@tanstack/react-query";

import { oauthApi } from "../api/oauthApi";

export const LINKED_ACCOUNTS_QUERY_KEY = ["linked-oauth-accounts"];

export const useLinkedAccounts = () => {
  return useQuery({
    queryKey: LINKED_ACCOUNTS_QUERY_KEY,
    queryFn: oauthApi.getLinkedAccounts,
  });
};
