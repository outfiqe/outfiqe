"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { ordersApi } from "../api/ordersApi";
import type { CustomerParcel, ReportNotReceivedBody } from "../api/trackingSchemas";
import { orderQueryKey } from "../constants/trackingQueryKeys";

export const useReportNotReceived = (orderId: string) =>
  useApiMutation<CustomerParcel, ApiClientError, ReportNotReceivedBody>({
    mutationFn: (body) => ordersApi.reportNotReceived(orderId, body),
    invalidateKeys: [orderQueryKey(orderId)],
  });
