import { useQuery } from "@tanstack/react-query";

import { reliabilityApi } from "../api/reliabilityApi";

export const BRANDS_TO_WATCH_QUERY_KEY = ["logistics-brands-to-watch"] as const;

export const useBrandsToWatch = () =>
  useQuery({ queryKey: BRANDS_TO_WATCH_QUERY_KEY, queryFn: reliabilityApi.listBrandsToWatch });
