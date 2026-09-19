"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import type { Address, AddressFormInput } from "../api/addressSchemas";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

type UpdateAddressVariables = { id: string; input: AddressFormInput };

export const useUpdateAddress = () =>
  useApiMutation<Address, ApiClientError, UpdateAddressVariables>({
    mutationFn: ({ id, input }) => addressApi.update(id, input),
    invalidateKeys: [ADDRESSES_QUERY_KEY],
  });
