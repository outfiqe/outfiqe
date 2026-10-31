import {
  Button,
  CLICKABLE_STAT_CARD_CLASS_NAME,
  FormBanner,
  StatCard,
  StatCardSkeleton,
} from "@outfiqe/design-system";
import { ChartCard, TrendChart } from "@outfiqe/design-system/charts";
import { formatShortDate } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { StatCardFooterLink } from "@/components/MetricParts";
import { MoneyBreakdownSection } from "@/features/financial-rollup/components/MoneyBreakdownSection";
import {
  PLATFORM_KPI_TOUR_ANCHOR,
  PLATFORM_TOUR_REPLAY_SEARCH,
  PLATFORM_TOUR_REPLAY_TO,
  PlatformDashboardTour,
  TOUR_REPLAY_LABEL,
} from "@/features/product-tour";
import { getErrorMessage } from "@/lib/errorMessages";

import { platformMetricsApi } from "../api/platformMetricsApi";
import type { PlatformActivityTrendPoint, PlatformOverview } from "../api/platformMetricsSchemas";
import { QuickAccessSection, QuickAccessSkeleton } from "./QuickAccessSection";

const OVERVIEW_KEY = ["platform-metrics-overview"];
const ACTIVITY_TREND_KEY = ["platform-metrics-activity-trend"];
const KPI_CARD_COUNT = 6;
const KPI_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";
const MIN_TREND_POINTS = 2;
const TENANT_LIST_PATH = "/platform/metrics";

const KPI_CARDS: {
  label: string;
  metricKey: Exclude<keyof PlatformOverview, "tenantsByPlan">;
  hint: string;
}[] = [
  {
    label: "Tenants",
    metricKey: "tenantCount",
    hint: "Customer organizations using the CRM. Internal platform accounts are not counted.",
  },
  {
    label: "Members",
    metricKey: "totalMembers",
    hint: "People who belong to a customer organization, added up across every organization.",
  },
  {
    label: "Contacts",
    metricKey: "totalContacts",
    hint: "Contacts stored in the CRM, added up across every customer organization.",
  },
  {
    label: "Deals",
    metricKey: "totalDeals",
    hint: "Pipeline deals created, added up across every customer organization.",
  },
  {
    label: "Tickets",
    metricKey: "totalTickets",
    hint: "Support tickets created, added up across every customer organization.",
  },
  {
    label: "Activities",
    metricKey: "totalActivities",
    hint: "Calls, notes and other activities logged, added up across every customer organization.",
  },
];

const OverviewKpiRow = ({ overview }: { overview: PlatformOverview }) => (
  <div data-tour-anchor={PLATFORM_KPI_TOUR_ANCHOR} className={KPI_GRID_CLASS}>
    {KPI_CARDS.map(({ label, metricKey, hint }) => (
      <StatCard
        key={label}
        label={label}
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        value={overview[metricKey].toLocaleString()}
        hint={hint}
        footer={<StatCardFooterLink to={TENANT_LIST_PATH} period="By organization" />}
      />
    ))}
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

const ACTIVITY_CHART_TITLE = "Activity";
const ACTIVITY_CHART_DESCRIPTION = "Platform-wide CRM activity per day";

const OverviewSkeleton = () => (
  <div className="space-y-8" role="status" aria-label="Loading">
    <div className={KPI_GRID_CLASS}>
      {Array.from({ length: KPI_CARD_COUNT }, (_unused, cardIndex) => (
        <StatCardSkeleton key={cardIndex} />
      ))}
    </div>
    <QuickAccessSkeleton />
    <ChartCard title={ACTIVITY_CHART_TITLE} description={ACTIVITY_CHART_DESCRIPTION} isLoading>
      {null}
    </ChartCard>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What needs action today, where the money went, and how the CRM is being used.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={PLATFORM_TOUR_REPLAY_TO} search={PLATFORM_TOUR_REPLAY_SEARCH}>
            <Compass aria-hidden="true" />
            {TOUR_REPLAY_LABEL}
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-8">
        {overview.error ? (
          <FormBanner>{getErrorMessage(overview.error)}</FormBanner>
        ) : overview.isLoading || !overview.data ? (
          <OverviewSkeleton />
        ) : (
          <>
            <OverviewKpiRow overview={overview.data} />

            <QuickAccessSection />

            <ChartCard
              title={ACTIVITY_CHART_TITLE}
              description={ACTIVITY_CHART_DESCRIPTION}
              ariaLabel="Platform-wide CRM activity per day over the recorded window"
              isLoading={activityTrend.isLoading}
              error={activityTrend.error ? getErrorMessage(activityTrend.error) : null}
              isEmpty={(activityTrend.data?.length ?? 0) < MIN_TREND_POINTS}
              emptyMessage="Not enough history yet. This fills in as days pass."
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

            <MoneyBreakdownSection />

            <PlatformDashboardTour />
          </>
        )}
      </div>
    </div>
  );
};
