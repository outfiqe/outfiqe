"use client";

import {
  Button,
  CheriqIcon,
  CLICKABLE_STAT_CARD_CLASS_NAME,
  FormBanner,
  Skeleton,
  StatCard,
} from "@outfiqe/design-system";
import { ChartCard, TrendChart } from "@outfiqe/design-system/charts";
import { formatShortDate } from "@outfiqe/utils";
import { Image as ImageIcon, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";

import { OverviewPeriodChips } from "@/components/OverviewPeriodChips";
import { StatCardFooterLink } from "@/components/StatCardFooterLink";
import { CreatorStatus } from "@/features/auth/types";
import {
  CREATOR_KPI_TOUR_ANCHOR,
  CREATOR_TOUR_REPLAY_HREF,
  CreatorDashboardTour,
  TourReplayLink,
} from "@/features/product-tour";
import { formatRupees } from "@/shared/lib/formatRupees";
import { DEFAULT_OVERVIEW_PERIOD_DAYS, type OverviewPeriodDays } from "@/shared/lib/overviewPeriod";

import type {
  CreatorOverview as CreatorOverviewData,
  CreatorOverviewTrendPoint,
} from "../api/creatorOverviewSchemas";
import { EarningsLedgerRow } from "../earnings/components/EarningsLedgerRow";
import { useCreatorOverview } from "../hooks/useCreatorOverview";
import { CreatorOverviewDetails } from "./CreatorOverviewDetails";
import { CreatorStatusGate } from "./CreatorStatusGate";

const KPI_CARD_COUNT = 6;
const RECENT_ROW_COUNT = 5;

const KPI_HINT = {
  totalEarnings:
    "Everything you have earned in commission from sales of the looks you tagged: still pending, available to withdraw, and already paid out.",
  availableEarnings: "Commission that has cleared and can be withdrawn now.",
  pendingEarnings:
    "Commission from recent sales that is still maturing. It moves to available once it clears.",
  followerCount: "People who currently follow you.",
  lookCount: "Looks you have dropped that are still live. Deleted looks are not counted.",
  totalLikes: "Cheriqs across all of your live looks.",
} as const;

const earningsDeltaFor = (overview: CreatorOverviewData) => {
  const { periodDays, periodEarnings, previousPeriodEarnings } = overview.kpis;
  const difference = periodEarnings - previousPeriodEarnings;
  if (difference === 0) return undefined;

  const tone = difference > 0 ? "positive" : "negative";
  const sign = difference > 0 ? "+" : "−";
  return {
    value: `${sign}${formatRupees(Math.abs(difference))}`,
    tone,
    label: `vs previous ${periodDays} days`,
  } as const;
};

const OverviewKpiRow = ({ overview }: { overview: CreatorOverviewData }) => {
  const { kpis } = overview;

  return (
    <div
      data-tour-anchor={CREATOR_KPI_TOUR_ANCHOR}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      <StatCard
        label="Total earnings"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.totalEarnings)}
        icon={Wallet}
        delta={earningsDeltaFor(overview)}
        hint={KPI_HINT.totalEarnings}
        footer={<StatCardFooterLink href="/earnings" label="See earnings" />}
      />
      <StatCard
        label="Available"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.availableEarnings)}
        hint={KPI_HINT.availableEarnings}
        footer={<StatCardFooterLink href="/withdraw" label="Withdraw" />}
      />
      <StatCard
        label="Pending"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={formatRupees(kpis.pendingEarnings)}
        hint={KPI_HINT.pendingEarnings}
        footer={<StatCardFooterLink href="/earnings" label="See earnings" />}
      />
      <StatCard
        label="Followers"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={kpis.followerCount.toLocaleString()}
        icon={Users}
        hint={KPI_HINT.followerCount}
        footer={<StatCardFooterLink href={`/creator/${overview.handle}`} label="See profile" />}
      />
      <StatCard
        label="Looks"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={kpis.lookCount.toLocaleString()}
        icon={ImageIcon}
        hint={KPI_HINT.lookCount}
        footer={<StatCardFooterLink href={`/creator/${overview.handle}`} label="See looks" />}
      />
      <StatCard
        label="Total cheriqs"
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={kpis.totalLikes.toLocaleString()}
        icon={CheriqIcon}
        hint={KPI_HINT.totalLikes}
        footer={<StatCardFooterLink href={`/creator/${overview.handle}`} label="See looks" />}
      />
    </div>
  );
};

const EarningsTrendTable = ({ trend }: { trend: CreatorOverviewTrendPoint[] }) => (
  <table>
    <caption>Earnings per day over the chosen period</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Earnings</th>
      </tr>
    </thead>
    <tbody>
      {trend.map((point) => (
        <tr key={point.date}>
          <td>{point.date}</td>
          <td>{formatRupees(point.earnings)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const EarningsTrendCard = ({ overview }: { overview: CreatorOverviewData }) => {
  const { trend, kpis } = overview;
  const hasEarnings = kpis.totalEarnings > 0;

  return (
    <ChartCard
      title="Earnings"
      description={`Commission per day, last ${kpis.periodDays} days`}
      ariaLabel="Commission earnings per day over the chosen period"
      isEmpty={!hasEarnings}
      emptyMessage="Not enough data yet — commission from your tagged drops will show here."
      dataTable={<EarningsTrendTable trend={trend} />}
    >
      <TrendChart
        data={trend}
        xKey="date"
        variant="area"
        series={[{ dataKey: "earnings", label: "Earnings" }]}
        formatXTick={(value) => formatShortDate(String(value))}
        formatYTick={(value) => value.toLocaleString()}
        formatTooltipValue={(value) => formatRupees(Number(value))}
        formatTooltipLabel={(label) => formatShortDate(String(label))}
      />
    </ChartCard>
  );
};

const RecentCommissions = ({ overview }: { overview: CreatorOverviewData }) => {
  const { recentCommissions } = overview;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">Recent commissions</h2>
        <Link href="/earnings" className="text-sm font-medium text-primary-strong hover:underline">
          View all
        </Link>
      </div>

      {recentCommissions.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No commissions yet — tag products in your drops to start earning.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {recentCommissions.map((commission) => (
            <EarningsLedgerRow key={commission.id} commission={commission} />
          ))}
        </div>
      )}
    </section>
  );
};

const OverviewSkeleton = () => (
  <div role="status" aria-label="Loading">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

type CreatorOverviewProps = {
  creatorStatus: CreatorStatus;
};

export const CreatorOverview = ({ creatorStatus }: CreatorOverviewProps) => {
  const [periodDays, setPeriodDays] = useState<OverviewPeriodDays>(DEFAULT_OVERVIEW_PERIOD_DAYS);
  const { data: overview, isPending, isError } = useCreatorOverview(creatorStatus, periodDays);

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <CreatorStatusGate
        creatorStatus={creatorStatus}
        pitch="Drop your fits, tag the pieces you're wearing, and track your earnings and reach from one place."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your earnings, reach and recent activity at a glance.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <TourReplayLink href={CREATOR_TOUR_REPLAY_HREF} />
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
              <OverviewKpiRow overview={overview} />
            </div>
            <div className="mt-8">
              <EarningsTrendCard overview={overview} />
            </div>
            <CreatorOverviewDetails overview={overview} />
            <RecentCommissions overview={overview} />
            <Suspense fallback={null}>
              <CreatorDashboardTour />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
};
