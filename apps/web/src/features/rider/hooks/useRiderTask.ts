"use client";

import { useQuery } from "@tanstack/react-query";

import { riderApi } from "../api/riderApi";
import { riderTaskQueryKey } from "../constants/riderQueryKeys";

export const useRiderTask = (taskId: string) =>
  useQuery({ queryKey: riderTaskQueryKey(taskId), queryFn: () => riderApi.getTask(taskId) });
