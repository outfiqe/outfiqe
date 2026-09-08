"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import type { Address, AddressFormInput } from "../api/addressSchemas";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

export const useCreateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation<Address, ApiClientError, AddressFormInput>({
    mutationFn: (input) => addressApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
};
