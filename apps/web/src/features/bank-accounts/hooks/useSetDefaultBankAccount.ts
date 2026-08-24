"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { bankAccountApi } from "../api/bankAccountApi";
import type { OwnerTypeValue } from "../api/bankAccountSchemas";

export const useSetDefaultBankAccount = (ownerType: OwnerTypeValue) => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: (id) => bankAccountApi.setDefault(ownerType, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts", ownerType] });
    },
  });
};
