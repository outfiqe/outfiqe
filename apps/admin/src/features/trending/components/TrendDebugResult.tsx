import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/apiClient";

import { trendingApi } from "../api/trendingApi";
import type { TrendDebugSubject } from "../api/trendingSchemas";
import { BASELINE_SOURCE_LABEL, formatNumber } from "../utils/trending.utils";
import { ActivityStat, ActivityStatSkeleton, StatCard, StatCardSkeleton } from "./TrendStatCards";

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
            Why it scored this way
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

  const trendSnapshot = snapshot.data;
  if (!trendSnapshot) return null;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Trending score" value={formatNumber(trendSnapshot.score)} />
        <StatCard
          label="Rank"
          value={trendSnapshot.rank ? `#${trendSnapshot.rank}` : "Not trending"}
          hint={
            trendSnapshot.rank
              ? "Position among today's trending candidates"
              : "No score above zero"
          }
        />
        <StatCard
          label="Freshness boost"
          value={
            trendSnapshot.freshnessMultiplier > 1
              ? `×${formatNumber(trendSnapshot.freshnessMultiplier)}`
              : "None"
          }
          hint={
            trendSnapshot.freshnessMultiplier > 1 ? "Product is 3 days old or newer" : undefined
          }
        />
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Activity in the last 6 hours
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <ActivityStat label="Purchases" value={trendSnapshot.recentActivity.purchaseUnits} />
          <ActivityStat label="Cart adds" value={trendSnapshot.recentActivity.cartAdds} />
          <ActivityStat label="Stashes" value={trendSnapshot.recentActivity.saves} />
          <ActivityStat label="Muse tags" value={trendSnapshot.recentActivity.creatorTags} />
          <ActivityStat label="Tag clicks" value={trendSnapshot.recentActivity.tagClicks} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Why it scored this way
        </h3>
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          <p>
            Activity right now:{" "}
            <span className="font-semibold">{formatNumber(trendSnapshot.decayedActivity)}</span>.
            Previous 6 hours:{" "}
            <span className="font-semibold">
              {formatNumber(trendSnapshot.previousWindowActivity)}
            </span>
            . That&apos;s a velocity of{" "}
            <span className="font-semibold">{formatNumber(trendSnapshot.velocity)}×</span>.
          </p>
          <p>
            Baseline ({BASELINE_SOURCE_LABEL[trendSnapshot.baseline.source]}):{" "}
            <span className="font-semibold">{formatNumber(trendSnapshot.baseline.value)}</span>.
            That&apos;s a lift of{" "}
            <span className="font-semibold">{formatNumber(trendSnapshot.baselineLift)}×</span> above
            normal.
          </p>
          <p>
            Velocity and baseline lift combine into a momentum of{" "}
            <span className="font-semibold">{formatNumber(trendSnapshot.momentum)}×</span>. This is
            capped so one spike can&apos;t take over the rankings.
          </p>
          <p className="text-xs text-muted-foreground">
            Scored at {new Date(trendSnapshot.scoredAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
