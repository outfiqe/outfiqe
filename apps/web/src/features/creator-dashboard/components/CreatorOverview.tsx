"use client";

import { ChartCard, FormBanner, Skeleton, StatCard, TrendChart } from "@outfiqe/design-system";
import { Heart, Image as ImageIcon, Users, Wallet } from "lucide-react";
import Link from "next/link";

import { CreatorStatus } from "@/features/auth/types";

import type {
  CreatorOverview as CreatorOverviewData,
  CreatorOverviewTrendPoint,
} from "../api/creatorOverviewSchemas";
import { useCreatorOverview } from "../hooks/useCreatorOverview";
import { CreatorStatusGate } from "./CreatorStatusGate";
import { EarningsLedgerRow } from "./EarningsLedgerRow";

const KPI_CARD_COUNT = 6;
const RECENT_ROW_COUNT = 5;

const formatRupees = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const formatShortDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const earningsDeltaFor = (overview: CreatorOverviewData) => {
  const { last30DaysEarnings, previous30DaysEarnings } = overview.kpis;
  const difference = last30DaysEarnings - previous30DaysEarnings;
  if (difference === 0) return undefined;

  const tone = difference > 0 ? "positive" : "negative";
  const sign = difference > 0 ? "+" : "−";
  return {
    value: `${sign}${formatRupees(Math.abs(difference))}`,
    tone,
    label: "vs previous 30 days",
  } as const;
};

const OverviewKpiRow = ({ overview }: { overview: CreatorOverviewData }) => {
  const { kpis } = overview;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label="Total earnings"
        value={formatRupees(kpis.totalEarnings)}
        icon={Wallet}
        delta={earningsDeltaFor(overview)}
      />
      <StatCard label="Available" value={formatRupees(kpis.availableEarnings)} />
      <StatCard label="Pending" value={formatRupees(kpis.pendingEarnings)} />
      <StatCard label="Followers" value={kpis.followerCount.toLocaleString()} icon={Users} />
      <StatCard label="Looks" value={kpis.lookCount.toLocaleString()} icon={ImageIcon} />
      <StatCard label="Total likes" value={kpis.totalLikes.toLocaleString()} icon={Heart} />
    </div>
  );
};

const EarningsTrendTable = ({ trend }: { trend: CreatorOverviewTrendPoint[] }) => (
  <table>
    <caption>Earnings per day over the last 30 days</caption>
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
      description="Commission per day, last 30 days"
      ariaLabel="Commission earnings per day over the last 30 days"
      isEmpty={!hasEarnings}
      emptyMessage="Not enough data yet — commission from your tagged posts will show here."
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
          No commissions yet — tag products in your posts to start earning.
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
  const { data: overview, isPending, isError } = useCreatorOverview();

  if (creatorStatus !== CreatorStatus.APPROVED) {
    return (
      <CreatorStatusGate
        creatorStatus={creatorStatus}
        pitch="Post your fits, tag the pieces you're wearing, and track your earnings and reach from one place."
      />
    );
  }

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your earnings, reach and recent activity at a glance.
        </p>
      </div>

      <div className="mt-6">
        {isError ? (
          <FormBanner>We couldn&apos;t load your overview right now. Please try again.</FormBanner>
        ) : isPending || !overview ? (
          <OverviewSkeleton />
        ) : (
          <>
            <OverviewKpiRow overview={overview} />
            <div className="mt-8">
              <EarningsTrendCard overview={overview} />
            </div>
            <RecentCommissions overview={overview} />
          </>
        )}
      </div>
    </div>
  );
};
