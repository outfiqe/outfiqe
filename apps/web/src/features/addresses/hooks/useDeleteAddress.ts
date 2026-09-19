"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

export const useDeleteAddress = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (id) => addressApi.remove(id),
    invalidateKeys: [ADDRESSES_QUERY_KEY],
  });
