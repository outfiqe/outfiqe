"use client";

import { useQuery } from "@tanstack/react-query";
import { exploreFeedApi } from "../api/exploreFeedApi";
import { useAuth } from "@/features/auth/context/AuthContext";

export const useSuggestedCreators = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["suggested-creators"],
    queryFn: () => exploreFeedApi.suggestedCreators(),
    enabled: isAuthenticated,
  });
};
