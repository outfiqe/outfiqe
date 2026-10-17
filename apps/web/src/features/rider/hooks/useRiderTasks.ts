"use client";

import { useQuery } from "@tanstack/react-query";

import { riderApi } from "../api/riderApi";
import { RIDER_TASKS_QUERY_KEY } from "../constants/riderQueryKeys";

export const useRiderTasks = () =>
  useQuery({ queryKey: RIDER_TASKS_QUERY_KEY, queryFn: riderApi.listOpenTasks });
