"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { bankAccountApi } from "../api/bankAccountApi";
import type { OwnerTypeValue } from "../api/bankAccountSchemas";

export const useSetDefaultBankAccount = (ownerType: OwnerTypeValue) =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (id) => bankAccountApi.setDefault(ownerType, id),
    invalidateKeys: [["bank-accounts", ownerType]],
  });
