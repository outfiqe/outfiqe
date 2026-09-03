import { ChartCard, FormBanner, Skeleton, StatCard, TrendChart } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { financialRollupApi } from "@/features/financial-rollup/api";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "./api";
import type { PlatformActivityTrendPoint, PlatformOverview } from "./schemas";

const OVERVIEW_KEY = ["platform-metrics-overview"];
const ACTIVITY_TREND_KEY = ["platform-metrics-activity-trend"];
const ROLLUP_KEY = ["platform-metrics-rollup-gap"];
const KPI_CARD_COUNT = 6;
const MIN_TREND_POINTS = 2;
const HEALTHY_GAP_RATIO = 0.02;

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const formatShortDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const sumRecord = (record: Partial<Record<string, number>>): number =>
  Object.values(record).reduce<number>((total, value) => total + (value ?? 0), 0);

const OverviewKpiRow = ({ overview }: { overview: PlatformOverview }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    <StatCard label="Tenants" value={overview.tenantCount.toLocaleString()} />
    <StatCard label="Members" value={overview.totalMembers.toLocaleString()} />
    <StatCard label="Contacts" value={overview.totalContacts.toLocaleString()} />
    <StatCard label="Deals" value={overview.totalDeals.toLocaleString()} />
    <StatCard label="Tickets" value={overview.totalTickets.toLocaleString()} />
    <StatCard label="Activities" value={overview.totalActivities.toLocaleString()} />
  </div>
);

const ActivityTrendTable = ({ points }: { points: PlatformActivityTrendPoint[] }) => (
  <table>
    <caption>Platform-wide CRM activity per day</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Activities</th>
      </tr>
    </thead>
    <tbody>
      {points.map((point) => (
        <tr key={point.date}>
          <td>{point.date}</td>
          <td>{point.activityCount}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const SettlementGap = () => {
  const rollup = useQuery({
    queryKey: ROLLUP_KEY,
    queryFn: () => financialRollupApi.get("30d"),
    retry: false,
  });

  if (rollup.isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (rollup.error || !rollup.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Settlement reconciliation is unavailable for your role.
      </p>
    );
  }

  const netHeld = rollup.data.gateway.netHeld;
  const ledgerOwed =
    sumRecord(rollup.data.ledger.owedToBrands) + sumRecord(rollup.data.ledger.owedToCreators);
  const gap = netHeld - ledgerOwed;
  const isHealthy = Math.abs(gap) <= Math.max(netHeld, ledgerOwed) * HEALTHY_GAP_RATIO;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard label="Gateway net held (30d)" value={formatRupees(netHeld)} />
      <StatCard label="Ledger owed (30d)" value={formatRupees(ledgerOwed)} />
      <StatCard
        label="Gap"
        value={formatRupees(gap)}
        delta={{
          value: isHealthy ? "Reconciled" : "Needs review",
          tone: isHealthy ? "positive" : "negative",
        }}
      />
    </div>
  );
};

const OverviewSkeleton = () => (
  <div className="space-y-8" role="status" aria-label="Loading">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: KPI_CARD_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-72 w-full rounded-2xl" />
  </div>
);

export const PlatformOverviewPage = () => {
  const overview = useQuery({ queryKey: OVERVIEW_KEY, queryFn: platformMetricsApi.getOverview });
  const activityTrend = useQuery({
    queryKey: ACTIVITY_TREND_KEY,
    queryFn: platformMetricsApi.getActivityTrend,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Platform-wide totals, activity trend and settlement reconciliation.
      </p>

      <div className="mt-6 space-y-8">
        {overview.error ? (
          <FormBanner>{getErrorMessage(overview.error)}</FormBanner>
        ) : overview.isLoading || !overview.data ? (
          <OverviewSkeleton />
        ) : (
          <>
            <OverviewKpiRow overview={overview.data} />

            <ChartCard
              title="Activity"
              description="Platform-wide CRM activity per day"
              ariaLabel="Platform-wide CRM activity per day over the recorded window"
              isLoading={activityTrend.isLoading}
              error={activityTrend.error ? getErrorMessage(activityTrend.error) : null}
              isEmpty={(activityTrend.data?.length ?? 0) < MIN_TREND_POINTS}
              emptyMessage="Not enough history yet — the daily snapshot builds this trend over time."
              dataTable={<ActivityTrendTable points={activityTrend.data ?? []} />}
            >
              <TrendChart
                data={activityTrend.data ?? []}
                xKey="date"
                variant="area"
                series={[{ dataKey: "activityCount", label: "Activities" }]}
                formatXTick={(value) => formatShortDate(String(value))}
                formatTooltipLabel={(label) => formatShortDate(String(label))}
              />
            </ChartCard>

            <section>
              <h2 className="font-display text-lg font-bold text-foreground">
                Settlement reconciliation
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Gateway money held vs. what the ledger says is owed, last 30 days.
              </p>
              <div className="mt-4">
                <SettlementGap />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
