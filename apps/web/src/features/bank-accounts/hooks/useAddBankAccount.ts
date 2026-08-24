"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { bankAccountApi } from "../api/bankAccountApi";
import type {
  AddBankAccountInput,
  CreateBankAccountResult,
  OwnerTypeValue,
} from "../api/bankAccountSchemas";

export const useAddBankAccount = (ownerType: OwnerTypeValue) => {
  const queryClient = useQueryClient();

  return useMutation<CreateBankAccountResult, ApiClientError, AddBankAccountInput>({
    mutationFn: (input) => bankAccountApi.create(ownerType, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", ownerType] });
    },
  });
};
