"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import type { Address, AddressFormInput } from "../api/addressSchemas";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

type UpdateAddressVariables = { id: string; input: AddressFormInput };

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();

  return useMutation<Address, ApiClientError, UpdateAddressVariables>({
    mutationFn: ({ id, input }) => addressApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
};
