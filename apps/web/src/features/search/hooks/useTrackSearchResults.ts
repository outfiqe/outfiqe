"use client";

import {
  ANALYTICS_EVENTS,
  type AnalyticsSearchScope,
  toAnalyticsSearchQuery,
} from "@outfiqe/utils";

import { useTrackView } from "@/features/analytics/hooks/useTrackView";

const NO_RESULTS = 0;

export const useTrackSearchResults = (
  searchScope: AnalyticsSearchScope,
  query: string,
  resultCount: number | null,
): void => {
  const searchQuery = toAnalyticsSearchQuery(query);

  useTrackView(
    ANALYTICS_EVENTS.SEARCH_QUERY_SUBMIT,
    {
      search_scope: searchScope,
      search_query: searchQuery,
      result_count: resultCount ?? NO_RESULTS,
      is_zero_result: resultCount === NO_RESULTS,
    },
    resultCount === null ? null : `${searchScope}:${searchQuery}`,
  );
};
