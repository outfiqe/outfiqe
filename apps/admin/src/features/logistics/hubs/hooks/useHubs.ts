import { useQuery } from "@tanstack/react-query";

import { hubsApi } from "../api/hubsApi";
import { HUBS_QUERY_KEY } from "../constants/hubQueryKeys";

export const useHubs = () =>
  useQuery({
    queryKey: HUBS_QUERY_KEY,
    queryFn: hubsApi.list,
  });
