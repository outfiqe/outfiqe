import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/apiClient";

import { trendingApi } from "../api/trendingApi";
import type { TrendDebugSubject } from "../api/trendingSchemas";
import { ActivityStatSkeleton, StatCardSkeleton } from "./TrendStatCards";
import { TrendStory } from "./TrendStory";

const SCORE_STAT_SKELETON_COUNT = 3;
const ACTIVITY_STAT_SKELETON_COUNT = 5;

export const TrendDebugResult = ({ product }: { product: TrendDebugSubject }) => {
  const snapshot = useQuery({
    queryKey: ["trend-debug", product.id],
    queryFn: () => trendingApi.getDebugSnapshot(product.id),
  });

  if (snapshot.isLoading) {
    return (
      <div className="mt-6 space-y-6" role="status" aria-label="Loading">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: SCORE_STAT_SKELETON_COUNT }, (_unused, statIndex) => (
            <StatCardSkeleton key={statIndex} />
          ))}
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Activity in the last 6 hours
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {Array.from({ length: ACTIVITY_STAT_SKELETON_COUNT }, (_unused, statIndex) => (
              <ActivityStatSkeleton key={statIndex} />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Why it is here
          </h3>
          <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-11/12" />
            <Skeleton className="h-5 w-10/12" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  if (snapshot.error) {
    const notFound =
      snapshot.error instanceof ApiClientError && snapshot.error.code === "PRODUCT_NOT_FOUND";
    return (
      <p className="mt-6 text-sm text-destructive">
        {notFound
          ? "This product isn't approved or no longer exists."
          : "Couldn't load trend data for this product."}
      </p>
    );
  }

  if (!snapshot.data) return null;

  return <TrendStory trendSnapshot={snapshot.data} productId={product.id} />;
};
