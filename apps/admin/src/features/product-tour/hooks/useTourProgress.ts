import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth/AuthContext";

import { toursApi } from "../api/toursApi";
import { TOUR_PROGRESS_QUERY_KEY } from "../constants/tourProgressQueryKey";

export const useTourProgress = () => {
  const { state } = useAuth();

  return useQuery({
    queryKey: TOUR_PROGRESS_QUERY_KEY,
    queryFn: toursApi.listMine,
    enabled: state.status === "signed-in",
    staleTime: Infinity,
  });
};
