"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/context/AuthContext";

import { exploreFeedApi } from "../api/exploreFeedApi";

export const useSuggestedCreators = () => {
  const { isAuthenticated, isAuthResolved } = useAuth();

  return useQuery({
    queryKey: ["suggested-creators"],
    queryFn: () => exploreFeedApi.suggestedCreators(),
    enabled: isAuthResolved && isAuthenticated,
  });
};
