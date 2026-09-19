"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

export const useSetDefaultAddress = () =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (id) => addressApi.setDefault(id),
    invalidateKeys: [ADDRESSES_QUERY_KEY],
  });
