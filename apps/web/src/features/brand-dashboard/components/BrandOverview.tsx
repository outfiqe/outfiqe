"use client";

import {
  Button,
  CLICKABLE_STAT_CARD_CLASS_NAME,
  FormBanner,
  Skeleton,
  StatCard,
} from "@outfiqe/design-system";
import { ChartCard, TrendChart } from "@outfiqe/design-system/charts";
import { formatShortDate } from "@outfiqe/utils";
import { AlertTriangle, Clock, Package, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";

import { OverviewPeriodChips } from "@/components/OverviewPeriodChips";
import { StatCardFooterLink } from "@/components/StatCardFooterLink";
import {
  BRAND_KPI_TOUR_ANCHOR,
  BRAND_TOUR_REPLAY_HREF,
  BrandDashboardTour,
  TourReplayLink,
} from "@/features/product-tour";
import { formatRupees } from "@/shared/lib/formatRupees";
import { DEFAULT_OVERVIEW_PERIOD_DAYS, type OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import type {
  BrandOverview as BrandOverviewData,
  BrandOverviewTrendPoint,
} from "../api/brandOverviewSchemas";
import { useBrandOverview } from "../hooks/useBrandOverview";
import { BrandShipmentRow } from "../shipments/components/BrandShipmentRow";
import { BrandOverviewDetails } from "./BrandOverviewDetails";

const KPI_CARD_COUNT = 7;
const RECENT_ROW_COUNT = 5;

const KPI_HINT = {
  periodRevenue:
    "Total value of items sold from your products in this period, before platform and payment fees. Cash-on-delivery orders count; cancelled and failed orders do not.",
  lifetimeRevenue:
    "Total value of every item ever sold from your products, before platform and payment fees. Cancelled and failed orders are not counted.",
  availablePayout:
    "Your earnings that have cleared and can be withdrawn now, after platform and payment fees are taken out.",
  pendingPayout:
    "Earnings from recent sales that are still maturing. They move to available once they clear.",
  productCount: "Live products in your catalogue. Deleted products are not counted.",
  lowStockCount:
    "Live products with only a few items left in stock, added up across all their sizes. Products that are fully out of stock are not shown here.",
  unfulfilledItemCount:
    "Paid and cash-on-delivery items that have not been delivered or cancelled yet.",
} as const;

const revenueDeltaFor = (overview: BrandOverviewData) => {
  const { periodDays, periodRevenue, previousPeriodRevenue } = overview.kpis;
  const difference = periodRevenue - previousPeriodRevenue;
  if (difference === 0) return undefined;

  return {
    value: `${difference > 0 ? "+" : "−"}${formatRupees(Math.abs(difference))}`,
    tone: difference > 0 ? "positive" : "negative",
    label: `vs previous ${periodDays} days`,
  } as const;
};

const BrandKpiRow = ({ overview }: { overview: BrandOverviewData }) => {
  const { kpis } = overview;

  return (
    <div
      data-tour-anchor={BRAND_KPI_TOUR_ANCHOR}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <StatCard
        label={`Revenue (${kpis.periodDays} days)`}
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.periodRevenue)}
        icon={Wallet}
        delta={revenueDeltaFor(overview)}
        hint={KPI_HINT.periodRevenue}
        footer={
          <StatCardFooterLink
            href="/manage-orders"
            label={`${kpis.periodOrderCount.toLocaleString()} orders`}
          />
        }
      />
      <StatCard
        label="Lifetime revenue"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.lifetimeRevenue)}
        hint={KPI_HINT.lifetimeRevenue}
        footer={<StatCardFooterLink href="/manage-orders" label="All time" />}
      />
      <StatCard
        label="Available payout"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.availablePayout)}
        hint={KPI_HINT.availablePayout}
        footer={<StatCardFooterLink href="/wallet" label="Withdraw" />}
      />
      <StatCard
        label="Pending payout"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.pendingPayout)}
        hint={KPI_HINT.pendingPayout}
        footer={<StatCardFooterLink href="/wallet" label="See wallet" />}
      />
      <StatCard
        label="Products"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={kpis.productCount.toLocaleString()}
        icon={Package}
        hint={KPI_HINT.productCount}
        footer={<StatCardFooterLink href="/products" label="Manage products" />}
      />
      <StatCard
        label="Low stock"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={kpis.lowStockCount.toLocaleString()}
        icon={AlertTriangle}
        hint={KPI_HINT.lowStockCount}
        footer={<StatCardFooterLink href="/products" label="Update stock" />}
      />
      <StatCard
        label="To fulfil"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={kpis.unfulfilledItemCount.toLocaleString()}
        icon={Clock}
        hint={KPI_HINT.unfulfilledItemCount}
        footer={<StatCardFooterLink href="/manage-orders" label="Open orders" />}
      />
    </div>
  );
};

const RevenueTrendTable = ({ trend }: { trend: BrandOverviewTrendPoint[] }) => (
  <table>
    <caption>Revenue per day over the chosen period</caption>
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
    description={`Sales of your products per day, last ${overview.kpis.periodDays} days`}
    ariaLabel="Revenue from your products per day over the chosen period"
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
        {overview.recentOrders.map((shipment) => (
          <BrandShipmentRow key={shipment.id} shipment={shipment} />
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
  const [periodDays, setPeriodDays] = useState<OverviewPeriodDays>(DEFAULT_OVERVIEW_PERIOD_DAYS);
  const { data: overview, isPending, isError } = useBrandOverview(periodDays);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your revenue, payouts and recent orders at a glance.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <TourReplayLink href={BRAND_TOUR_REPLAY_HREF} />
        </Button>
      </div>

      <div className="mt-6">
        {isError ? (
          <FormBanner>We couldn&apos;t load your overview right now. Please try again.</FormBanner>
        ) : isPending || !overview ? (
          <OverviewSkeleton />
        ) : (
          <>
            <OverviewPeriodChips selectedDays={periodDays} onSelect={setPeriodDays} />
            <div className="mt-4">
              <BrandKpiRow overview={overview} />
            </div>
            <div className="mt-8">
              <RevenueTrendCard overview={overview} />
            </div>
            <BrandOverviewDetails overview={overview} />
            <RecentOrders overview={overview} />
            <Suspense fallback={null}>
              <BrandDashboardTour />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
};
