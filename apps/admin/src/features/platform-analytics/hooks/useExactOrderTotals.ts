import { useQuery } from "@tanstack/react-query";

import { financialRollupApi } from "@/features/financial-rollup/api/financialRollupApi";

import { EXACT_ORDER_TOTALS_QUERY_KEY } from "../constants/platformAnalytics.constants";

const EXACT_TOTALS_RANGE = "30d";

export const useExactOrderTotals = () =>
  useQuery({
    queryKey: EXACT_ORDER_TOTALS_QUERY_KEY,
    queryFn: () => financialRollupApi.get(EXACT_TOTALS_RANGE),
    retry: false,
  });
