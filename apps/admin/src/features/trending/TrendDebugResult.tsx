import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { ApiClientError } from "@/lib/apiClient";

import { trendingApi } from "./api";
import type { TrendDebugSubject } from "./schemas";
import { BASELINE_SOURCE_LABEL, formatNumber } from "./trending.utils";
import { ActivityStat, StatCard } from "./TrendStatCards";

export const TrendDebugResult = ({ product }: { product: TrendDebugSubject }) => {
  const snapshot = useQuery({
    queryKey: ["trend-debug", product.id],
    queryFn: () => trendingApi.getDebugSnapshot(product.id),
  });

  if (snapshot.isLoading) {
    return (
      <div className="mt-6 space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
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

  const data = snapshot.data;
  if (!data) return null;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Trending score" value={formatNumber(data.score)} />
        <StatCard
          label="Rank"
          value={data.rank ? `#${data.rank}` : "Not trending"}
          hint={data.rank ? "Position among today's trending candidates" : "No score above zero"}
        />
        <StatCard
          label="Freshness boost"
          value={
            data.freshnessMultiplier > 1 ? `×${formatNumber(data.freshnessMultiplier)}` : "None"
          }
          hint={data.freshnessMultiplier > 1 ? "Product is 3 days old or newer" : undefined}
        />
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Activity in the last 6 hours
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <ActivityStat label="Purchases" value={data.recentActivity.purchaseUnits} />
          <ActivityStat label="Cart adds" value={data.recentActivity.cartAdds} />
          <ActivityStat label="Saves" value={data.recentActivity.saves} />
          <ActivityStat label="Creator tags" value={data.recentActivity.creatorTags} />
          <ActivityStat label="Tag clicks" value={data.recentActivity.tagClicks} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Why it scored this way
        </h3>
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
          <p>
            Activity right now:{" "}
            <span className="font-semibold">{formatNumber(data.decayedActivity)}</span>. Previous 6
            hours:{" "}
            <span className="font-semibold">{formatNumber(data.previousWindowActivity)}</span>.
            That&apos;s a velocity of{" "}
            <span className="font-semibold">{formatNumber(data.velocity)}×</span>.
          </p>
          <p>
            Baseline ({BASELINE_SOURCE_LABEL[data.baseline.source]}):{" "}
            <span className="font-semibold">{formatNumber(data.baseline.value)}</span>. That&apos;s
            a lift of <span className="font-semibold">{formatNumber(data.baselineLift)}×</span>{" "}
            above normal.
          </p>
          <p>
            Velocity and baseline lift combine into a momentum of{" "}
            <span className="font-semibold">{formatNumber(data.momentum)}×</span>. This is capped so
            one spike can&apos;t take over the rankings.
          </p>
          <p className="text-xs text-muted-foreground">
            Scored at {new Date(data.scoredAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};
