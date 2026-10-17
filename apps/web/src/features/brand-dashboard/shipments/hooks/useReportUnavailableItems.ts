"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { unavailableItemApi } from "../api/unavailableItemApi";
import type {
  ReportUnavailableItemsBody,
  UnavailableItemReport,
} from "../api/unavailableItemSchemas";
import { unavailableItemReportsQueryKey } from "./useUnavailableItemReports";

export const useReportUnavailableItems = (groupId: string) =>
  useApiMutation<UnavailableItemReport[], ApiClientError, ReportUnavailableItemsBody>({
    mutationFn: (body) => unavailableItemApi.report(groupId, body),
    invalidateKeys: [unavailableItemReportsQueryKey(groupId)],
  });
