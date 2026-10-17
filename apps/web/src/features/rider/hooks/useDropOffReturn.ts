"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { riderApi } from "../api/riderApi";
import type { RiderTask } from "../api/riderSchemas";
import { RIDER_TASKS_QUERY_KEY } from "../constants/riderQueryKeys";

export const useDropOffReturn = (taskId: string) =>
  useApiMutation<RiderTask, ApiClientError, string>({
    mutationFn: (brandReturnId) => riderApi.dropOffReturn(taskId, brandReturnId),
    invalidateKeys: [RIDER_TASKS_QUERY_KEY],
    successMessage: "Handed back to the brand.",
  });
