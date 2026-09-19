"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { bankAccountApi } from "../api/bankAccountApi";
import type {
  AddBankAccountInput,
  CreateBankAccountResult,
  OwnerTypeValue,
} from "../api/bankAccountSchemas";

export const useAddBankAccount = (ownerType: OwnerTypeValue) =>
  useApiMutation<CreateBankAccountResult, ApiClientError, AddBankAccountInput>({
    mutationFn: (input) => bankAccountApi.create(ownerType, input),
    invalidateKeys: [["bank-accounts", ownerType]],
  });
