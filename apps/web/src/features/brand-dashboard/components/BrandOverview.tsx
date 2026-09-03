"use client";

import { ChartCard, FormBanner, Skeleton, StatCard, TrendChart } from "@outfiqe/design-system";
import { AlertTriangle, Clock, Package, Wallet } from "lucide-react";
import Link from "next/link";

import type {
  BrandOverview as BrandOverviewData,
  BrandOverviewTrendPoint,
} from "../api/brandOverviewSchemas";
import { useBrandOverview } from "../hooks/useBrandOverview";
import { BrandOrderRow } from "./BrandOrderRow";

const KPI_CARD_COUNT = 7;
const RECENT_ROW_COUNT = 5;

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const formatShortDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const revenueDeltaFor = (overview: BrandOverviewData) => {
  const { last30DaysRevenue, previous30DaysRevenue } = overview.kpis;
  const difference = last30DaysRevenue - previous30DaysRevenue;
  if (difference === 0) return undefined;

  return {
    value: `${difference > 0 ? "+" : "−"}${formatRupees(Math.abs(difference))}`,
    tone: difference > 0 ? "positive" : "negative",
    label: "vs previous 30 days",
  } as const;
};

const BrandKpiRow = ({ overview }: { overview: BrandOverviewData }) => {
  const { kpis } = overview;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatCard
        label="Revenue (30 days)"
        value={formatRupees(kpis.last30DaysRevenue)}
        icon={Wallet}
        delta={revenueDeltaFor(overview)}
      />
      <StatCard label="Lifetime revenue" value={formatRupees(kpis.lifetimeRevenue)} />
      <StatCard label="Available payout" value={formatRupees(kpis.availablePayout)} />
      <StatCard label="Pending payout" value={formatRupees(kpis.pendingPayout)} />
      <StatCard label="Products" value={kpis.productCount.toLocaleString()} icon={Package} />
      <StatCard
        label="Low stock"
        value={kpis.lowStockCount.toLocaleString()}
        icon={AlertTriangle}
      />
      <StatCard label="To fulfil" value={kpis.unfulfilledItemCount.toLocaleString()} icon={Clock} />
    </div>
  );
};

const RevenueTrendTable = ({ trend }: { trend: BrandOverviewTrendPoint[] }) => (
  <table>
    <caption>Revenue per day over the last 30 days</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Revenue</th>
        <th scope="col">Orders</th>
      </tr>
    </thead>
    <tbody>
      {trend.map((point) => (
        <tr key={point.date}>
          <td>{point.date}</td>
          <td>{formatRupees(point.revenue)}</td>
          <td>{point.orderCount}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const RevenueTrendCard = ({ overview }: { overview: BrandOverviewData }) => (
  <ChartCard
    title="Revenue"
    description="Sales of your products per day, last 30 days"
    ariaLabel="Revenue from your products per day over the last 30 days"
    isEmpty={overview.kpis.lifetimeRevenue === 0}
    emptyMessage="Not enough data yet — revenue will show here once your products start selling."
    dataTable={<RevenueTrendTable trend={overview.trend} />}
  >
    <TrendChart
      data={overview.trend}
      xKey="date"
      variant="area"
      series={[{ dataKey: "revenue", label: "Revenue" }]}
      formatXTick={(value) => formatShortDate(String(value))}
      formatYTick={(value) => value.toLocaleString()}
      formatTooltipValue={(value) => formatRupees(Number(value))}
      formatTooltipLabel={(label) => formatShortDate(String(label))}
    />
  </ChartCard>
);

const RecentOrders = ({ overview }: { overview: BrandOverviewData }) => (
  <section className="mt-8">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-foreground">Recent orders</h2>
      <Link
        href="/manage-orders"
        className="text-sm font-medium text-primary-strong hover:underline"
      >
        View all
      </Link>
    </div>

    {overview.recentOrders.length === 0 ? (
      <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No sales yet — they&apos;ll show up here once your products start selling.
      </p>
    ) : (
      <div className="mt-4 space-y-3">
        {overview.recentOrders.map((item) => (
          <BrandOrderRow key={item.id} item={item} />
        ))}
      </div>
    )}
  </section>
);

const OverviewSkeleton = () => (
  <div role="status" aria-label="Loading">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: KPI_CARD_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="mt-8 h-72 w-full rounded-2xl" />
    <div className="mt-8 space-y-3">
      {Array.from({ length: RECENT_ROW_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);

export const BrandOverview = () => {
  const { data: overview, isPending, isError } = useBrandOverview();

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your revenue, payouts and recent orders at a glance.
        </p>
      </div>

      <div className="mt-6">
        {isError ? (
          <FormBanner>We couldn&apos;t load your overview right now. Please try again.</FormBanner>
        ) : isPending || !overview ? (
          <OverviewSkeleton />
        ) : (
          <>
            <BrandKpiRow overview={overview} />
            <div className="mt-8">
              <RevenueTrendCard overview={overview} />
            </div>
            <RecentOrders overview={overview} />
          </>
        )}
      </div>
    </div>
  );
};
