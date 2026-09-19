"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import type { Address, AddressFormInput } from "../api/addressSchemas";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

export const useCreateAddress = () =>
  useApiMutation<Address, ApiClientError, AddressFormInput>({
    mutationFn: (input) => addressApi.create(input),
    invalidateKeys: [ADDRESSES_QUERY_KEY],
  });
