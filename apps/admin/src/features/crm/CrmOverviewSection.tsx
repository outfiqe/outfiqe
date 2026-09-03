import {
  BarSeries,
  ChartCard,
  FormBanner,
  Skeleton,
  StatCard,
  TrendChart,
} from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDuration, formatRupees } from "./format.utils";
import { crmReportingApi } from "./reportingApi";
import type { CrmOverviewReport } from "./reportingSchemas";

const OVERVIEW_REPORT_KEY = ["crm-report-overview"];
const KPI_CARD_COUNT = 6;

const formatShortDate = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const OverviewKpiRow = ({ report }: { report: CrmOverviewReport }) => {
  const { pipeline, tickets, openTasksDueTodayCount } = report;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Open pipeline" value={formatRupees(pipeline.totals.openValue)} />
      <StatCard label="Open deals" value={String(pipeline.totals.openDealCount)} />
      <StatCard label="Won value" value={formatRupees(pipeline.totals.wonValue)} />
      <StatCard label="Open tickets" value={String(tickets.openCount)} />
      <StatCard
        label="Mean time to resolve"
        value={formatDuration(tickets.meanResolutionSeconds)}
      />
      <StatCard label="Tasks due today" value={String(openTasksDueTodayCount)} />
    </div>
  );
};

const ActivityTrendTable = ({ report }: { report: CrmOverviewReport }) => (
  <table>
    <caption>CRM activities logged per day over the last 30 days</caption>
    <thead>
      <tr>
        <th scope="col">Date</th>
        <th scope="col">Activities</th>
      </tr>
    </thead>
    <tbody>
      {report.activityTrend.map((point) => (
        <tr key={point.date}>
          <td>{point.date}</td>
          <td>{point.count}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const PipelineStageTable = ({ report }: { report: CrmOverviewReport }) => (
  <table>
    <caption>Open deal value by pipeline stage</caption>
    <thead>
      <tr>
        <th scope="col">Stage</th>
        <th scope="col">Open value</th>
        <th scope="col">Open deals</th>
      </tr>
    </thead>
    <tbody>
      {report.pipeline.stages
        .filter((stage) => !stage.isWon && !stage.isLost)
        .map((stage) => (
          <tr key={stage.stageId}>
            <td>{stage.stageName}</td>
            <td>{formatRupees(stage.openValue)}</td>
            <td>{stage.openDealCount}</td>
          </tr>
        ))}
    </tbody>
  </table>
);

const OverviewCharts = ({ report }: { report: CrmOverviewReport }) => {
  const { pipeline, activityTrend } = report;
  const hasActivity = activityTrend.some((point) => point.count > 0);
  const hasPipelineValue = pipeline.totals.openValue > 0 || pipeline.totals.wonValue > 0;
  const openStages = pipeline.stages
    .filter((stage) => !stage.isWon && !stage.isLost)
    .map((stage) => ({ stage: stage.stageName, openValue: stage.openValue }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Activity"
        description="CRM activities logged per day, last 30 days"
        ariaLabel="CRM activities logged per day over the last 30 days"
        isEmpty={!hasActivity}
        emptyMessage="Not enough data yet — logged calls, notes and emails will show here."
        dataTable={<ActivityTrendTable report={report} />}
      >
        <TrendChart
          data={activityTrend}
          xKey="date"
          series={[{ dataKey: "count", label: "Activities" }]}
          formatXTick={(value) => formatShortDate(String(value))}
          formatTooltipLabel={(label) => formatShortDate(String(label))}
        />
      </ChartCard>

      <ChartCard
        title="Pipeline value by stage"
        description="Open deal value per stage"
        ariaLabel="Open deal value by pipeline stage"
        isEmpty={!hasPipelineValue}
        emptyMessage="Not enough data yet — add deals to the pipeline to see value by stage."
        dataTable={<PipelineStageTable report={report} />}
      >
        <BarSeries
          data={openStages}
          categoryKey="stage"
          orientation="bar"
          series={[{ dataKey: "openValue", label: "Open value" }]}
          formatValue={(value) => formatRupees(Number(value))}
        />
      </ChartCard>
    </div>
  );
};

export const CrmOverviewSection = () => {
  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: OVERVIEW_REPORT_KEY,
    queryFn: crmReportingApi.getOverviewReport,
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-foreground">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pipeline, support and activity for this organization at a glance.
        </p>
      </div>

      {error ? (
        <FormBanner>{getErrorMessage(error)}</FormBanner>
      ) : isLoading || !report ? (
        <div className="space-y-4" role="status" aria-label="Loading">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: KPI_CARD_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          <OverviewKpiRow report={report} />
          <OverviewCharts report={report} />
        </>
      )}
    </section>
  );
};
