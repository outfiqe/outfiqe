"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";
import { type FeatureFlagKey, featureFlagsApi } from "@/shared/lib/featureFlagsApi";

const FEATURE_FLAGS_STALE_TIME_MS = 60 * 1000;

export const myFeatureFlagsQueryKey = (userId: string | null) => ["feature-flags", "mine", userId];

export type FeatureFlagState = {
  isEnabled: boolean;
  isResolved: boolean;
};

export const useFeatureFlagState = (key: FeatureFlagKey): FeatureFlagState => {
  const { state } = useAuth();
  const userId = state.user?.id ?? null;
  const { data: enabledKeys, isPending } = useQuery({
    queryKey: myFeatureFlagsQueryKey(userId),
    queryFn: featureFlagsApi.listMine,
    staleTime: FEATURE_FLAGS_STALE_TIME_MS,
  });
  return { isEnabled: enabledKeys?.includes(key) ?? false, isResolved: !isPending };
};

export const useFeatureFlag = (key: FeatureFlagKey): boolean => useFeatureFlagState(key).isEnabled;
