import { useQuery } from "@tanstack/react-query";

import { ridersApi } from "../api/ridersApi";
import { RIDERS_QUERY_KEY } from "../constants/riderQueryKeys";

export const useActiveRiders = (hubId: string) =>
  useQuery({
    queryKey: [...RIDERS_QUERY_KEY, hubId, "active"],
    queryFn: () => ridersApi.listActive(hubId),
  });
