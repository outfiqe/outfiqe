"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { withdrawApi } from "../api/withdrawApi";
import type {
  CreateWithdrawRequestInput,
  OwnerTypeValue,
  WithdrawRequest,
} from "../api/withdrawSchemas";

export const useCreateWithdrawRequest = (ownerType: OwnerTypeValue) => {
  const queryClient = useQueryClient();

  return useMutation<WithdrawRequest, ApiClientError, CreateWithdrawRequestInput>({
    mutationFn: (input) => withdrawApi.createRequest(ownerType, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["withdraw", "eligibility", ownerType] });
      queryClient.invalidateQueries({ queryKey: ["withdraw", "requests", ownerType] });
    },
  });
};
