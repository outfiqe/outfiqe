"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { withdrawApi } from "../api/withdrawApi";
import type {
  CreateWithdrawRequestInput,
  OwnerTypeValue,
  WithdrawRequest,
} from "../api/withdrawSchemas";

export const useCreateWithdrawRequest = (ownerType: OwnerTypeValue) =>
  useApiMutation<WithdrawRequest, ApiClientError, CreateWithdrawRequestInput>({
    mutationFn: (input) => withdrawApi.createRequest(ownerType, input),
    invalidateKeys: [
      ["withdraw", "eligibility", ownerType],
      ["withdraw", "requests", ownerType],
    ],
  });
