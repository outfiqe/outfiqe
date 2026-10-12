"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { bankAccountApi } from "../api/bankAccountApi";
import type { BankQrPreview } from "../api/bankAccountSchemas";

export const usePreviewBankQr = () =>
  useApiMutation<BankQrPreview, ApiClientError, string>({
    mutationFn: (qrCodeImageUrl) => bankAccountApi.previewQr(qrCodeImageUrl),
  });
