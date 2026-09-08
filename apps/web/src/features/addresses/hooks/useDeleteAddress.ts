"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { addressApi } from "../api/addressApi";
import { ADDRESSES_QUERY_KEY } from "./useAddresses";

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => addressApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
};
