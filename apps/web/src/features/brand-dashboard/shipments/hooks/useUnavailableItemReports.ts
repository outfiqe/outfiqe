"use client";

import { useQuery } from "@tanstack/react-query";

import { unavailableItemApi } from "../api/unavailableItemApi";

export const unavailableItemReportsQueryKey = (groupId: string) =>
  ["brand-shipment", groupId, "unavailable-items"] as const;

export const useUnavailableItemReports = (groupId: string) =>
  useQuery({
    queryKey: unavailableItemReportsQueryKey(groupId),
    queryFn: () => unavailableItemApi.list(groupId),
  });
