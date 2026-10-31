import { useQuery } from "@tanstack/react-query";

import {
  ANALYTICS_STALE_TIME_MS,
  type AnalyticsRange,
  PLATFORM_ANALYTICS_QUERY_KEY,
} from "../constants/platformAnalytics.constants";

export const usePlatformAnalyticsInsight = <Result>(
  insightKey: string,
  fetchInsight: (range: AnalyticsRange) => Promise<Result>,
  range: AnalyticsRange,
) =>
  useQuery({
    queryKey: [...PLATFORM_ANALYTICS_QUERY_KEY, insightKey, range],
    queryFn: () => fetchInsight(range),
    staleTime: ANALYTICS_STALE_TIME_MS,
  });
