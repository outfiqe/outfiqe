import { FormBanner, StatCard, StatCardSkeleton } from "@outfiqe/design-system";
import { BarSeries, ChartCard, TrendChart } from "@outfiqe/design-system/charts";
import { formatShortDate } from "@outfiqe/utils";
import { useQuery } from "@tanstack/react-query";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDuration, formatRupees } from "../../utils/format.utils";
import { crmReportingApi } from "../api/reportingApi";
import type { CrmOverviewReport } from "../api/reportingSchemas";

const OVERVIEW_REPORT_KEY = ["crm-report-overview"];
const KPI_CARD_COUNT = 6;
const KPI_HINT = {
  openPipelineValue:
    "Total value of opportunities your team is still working on, across every stage. Won and lost ones are not counted.",
  openDealCount:
    "Number of opportunities your team is still working on. Won and lost ones are not counted.",
  wonDealValue: "Total value of the opportunities you have won.",
  openTicketCount: "Support tickets that still need attention: tickets marked open or in progress.",
  meanTimeToResolve:
    "Average time between a ticket being created and being resolved, across all resolved tickets. Shows a dash until a ticket has been resolved.",
  tasksDueToday:
    "Open tasks due by the end of today. This includes open tasks that are already overdue.",
} as const;
const KPI_GRID_CLASS = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6";
const CHART_GRID_CLASS = "grid gap-4 lg:grid-cols-2";
const ACTIVITY_CHART_TITLE = "Activity";
const ACTIVITY_CHART_DESCRIPTION = "CRM activities logged per day, last 30 days";
const PIPELINE_CHART_TITLE = "Sales value by stage";
const PIPELINE_CHART_DESCRIPTION = "Value of open opportunities at each stage";

const OverviewKpiRow = ({ report }: { report: CrmOverviewReport }) => {
  const { pipeline, tickets, openTasksDueTodayCount } = report;

  return (
    <div className={KPI_GRID_CLASS}>
      <StatCard
        label="Sales in progress"
        value={formatRupees(pipeline.totals.openValue)}
        hint={KPI_HINT.openPipelineValue}
      />
      <StatCard
        label="Open opportunities"
        value={String(pipeline.totals.openDealCount)}
        hint={KPI_HINT.openDealCount}
      />
      <StatCard
        label="Won value"
        value={formatRupees(pipeline.totals.wonValue)}
        hint={KPI_HINT.wonDealValue}
      />
      <StatCard
        label="Open tickets"
        value={String(tickets.openCount)}
        hint={KPI_HINT.openTicketCount}
      />
      <StatCard
        label="Average time to solve"
        value={formatDuration(tickets.meanResolutionSeconds)}
        hint={KPI_HINT.meanTimeToResolve}
      />
      <StatCard
        label="Tasks due today"
        value={String(openTasksDueTodayCount)}
        hint={KPI_HINT.tasksDueToday}
      />
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
    <caption>Value of open opportunities by stage</caption>
    <thead>
      <tr>
        <th scope="col">Stage</th>
        <th scope="col">Open value</th>
        <th scope="col">Open opportunities</th>
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
    <div className={CHART_GRID_CLASS}>
      <ChartCard
        title={ACTIVITY_CHART_TITLE}
        description={ACTIVITY_CHART_DESCRIPTION}
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
        title={PIPELINE_CHART_TITLE}
        description={PIPELINE_CHART_DESCRIPTION}
        ariaLabel="Value of open opportunities by stage"
        isEmpty={!hasPipelineValue}
        emptyMessage="Not enough data yet. Add opportunities to the sales board to see their value by stage."
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

const OverviewKpiSkeleton = () => (
  <div className={KPI_GRID_CLASS} role="status" aria-label="Loading">
    {Array.from({ length: KPI_CARD_COUNT }, (_unused, cardIndex) => (
      <StatCardSkeleton key={cardIndex} />
    ))}
  </div>
);

const OverviewChartsSkeleton = () => (
  <div className={CHART_GRID_CLASS}>
    <ChartCard title={ACTIVITY_CHART_TITLE} description={ACTIVITY_CHART_DESCRIPTION} isLoading>
      {null}
    </ChartCard>
    <ChartCard title={PIPELINE_CHART_TITLE} description={PIPELINE_CHART_DESCRIPTION} isLoading>
      {null}
    </ChartCard>
  </div>
);

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
          Your sales, support and team activity at a glance.
        </p>
      </div>

      {error ? (
        <FormBanner>{getErrorMessage(error)}</FormBanner>
      ) : isLoading || !report ? (
        <>
          <OverviewKpiSkeleton />
          <OverviewChartsSkeleton />
        </>
      ) : (
        <>
          <OverviewKpiRow report={report} />
          <OverviewCharts report={report} />
        </>
      )}
    </section>
  );
};
