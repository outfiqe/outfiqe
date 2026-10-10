"use client";

import { useApiMutation } from "@outfiqe/hooks";
import type { FitMeasurements } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthContext";
import type { ApiClientError } from "@/shared/lib/apiClient";

import { fitProfileApi } from "../api/fitProfileApi";

export const FIT_PROFILE_QUERY_KEY = ["fit-profile", "mine"];

export const useFitProfile = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: FIT_PROFILE_QUERY_KEY,
    queryFn: fitProfileApi.getMine,
    enabled: isAuthenticated,
  });
};

export const useSaveFitProfile = () =>
  useApiMutation<FitMeasurements | null, ApiClientError, FitMeasurements>({
    mutationFn: fitProfileApi.save,
    invalidateKeys: [FIT_PROFILE_QUERY_KEY],
  });

export const useRemoveFitProfile = () =>
  useApiMutation<void, ApiClientError, void>({
    mutationFn: fitProfileApi.remove,
    invalidateKeys: [FIT_PROFILE_QUERY_KEY],
  });
