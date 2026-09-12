"use client";

import { useDebouncedValue } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";

import { creatorDashboardApi } from "../api/creatorDashboardApi";
import {
  HANDLE_MAX_LENGTH,
  HANDLE_MIN_LENGTH,
  HANDLE_PATTERN,
} from "../api/creatorDashboardSchemas";

const HANDLE_AVAILABILITY_DEBOUNCE_MS = 300;

export type HandleAvailabilityStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const isValidHandleFormat = (candidate: string) =>
  candidate.length >= HANDLE_MIN_LENGTH &&
  candidate.length <= HANDLE_MAX_LENGTH &&
  HANDLE_PATTERN.test(candidate);

export const useHandleAvailability = (draftHandle: string, currentHandle: string) => {
  const normalizedDraft = draftHandle.trim().toLowerCase();
  const debouncedDraft = useDebouncedValue(normalizedDraft, HANDLE_AVAILABILITY_DEBOUNCE_MS);

  const isUnchanged = normalizedDraft === currentHandle;
  const isValidFormat = isValidHandleFormat(normalizedDraft);
  const shouldCheck =
    debouncedDraft.length > 0 &&
    debouncedDraft !== currentHandle &&
    isValidHandleFormat(debouncedDraft);

  const { data, isFetching } = useQuery({
    queryKey: ["handle-availability", debouncedDraft],
    queryFn: () => creatorDashboardApi.checkHandleAvailability(debouncedDraft),
    enabled: shouldCheck,
    staleTime: HANDLE_AVAILABILITY_DEBOUNCE_MS,
  });

  const status: HandleAvailabilityStatus = (() => {
    if (normalizedDraft.length === 0 || isUnchanged) return "idle";
    if (!isValidFormat) return "invalid";
    if (normalizedDraft !== debouncedDraft || isFetching || data === undefined) return "checking";
    return data.available ? "available" : "taken";
  })();

  return status;
};
