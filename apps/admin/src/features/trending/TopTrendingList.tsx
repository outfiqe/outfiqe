import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { trendingApi } from "./api";
import type { TrendingProductSummary } from "./schemas";
import { formatNumber } from "./trending.utils";

const TOP_TRENDING_SKELETON_COUNT = 5;

export const TopTrendingList = ({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (entry: TrendingProductSummary) => void;
}) => {
  const topTrending = useQuery({
    queryKey: ["trend-debug-top-products"],
    queryFn: () => trendingApi.listTopTrending(),
  });

  if (topTrending.isLoading) {
    return (
      <ul className="mt-3 space-y-1.5" role="status" aria-label="Loading">
        {Array.from({ length: TOP_TRENDING_SKELETON_COUNT }, (_unused, rowIndex) => (
          <li
            key={rowIndex}
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <Skeleton className="h-5 w-8" />
            <span className="min-w-0 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </span>
            <Skeleton className="h-4 w-10 shrink-0" />
          </li>
        ))}
      </ul>
    );
  }

  if (topTrending.error) {
    return <p className="mt-3 text-sm text-destructive">Couldn&apos;t load the trending list.</p>;
  }

  const entries = topTrending.data ?? [];
  if (entries.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Nothing is trending yet. Check back once there&apos;s real purchase, cart, save, or
        creator-tag activity.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {entries.map((entry) => (
        <li key={entry.productId}>
          <button
            type="button"
            onClick={() => onSelect(entry)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
              selectedId === entry.productId
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <span className="font-display text-sm font-bold text-muted-foreground">
              #{entry.rank}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {entry.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{entry.brand}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-muted-foreground">
              {formatNumber(entry.score)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
