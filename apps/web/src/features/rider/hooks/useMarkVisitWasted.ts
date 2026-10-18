"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { riderApi } from "../api/riderApi";
import type { RiderTask } from "../api/riderSchemas";
import { RIDER_TASKS_QUERY_KEY } from "../constants/riderQueryKeys";

export const useMarkVisitWasted = (taskId: string) =>
  useApiMutation<RiderTask, ApiClientError, string>({
    mutationFn: (reason) => riderApi.markWasted(taskId, reason),
    invalidateKeys: [RIDER_TASKS_QUERY_KEY],
  });
