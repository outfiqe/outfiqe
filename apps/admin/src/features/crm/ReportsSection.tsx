import { FormBanner, Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { getErrorMessage } from "@/lib/errorMessages";

import { formatDuration, formatRupees } from "./format.utils";
import { crmReportingApi } from "./reportingApi";
import type { PipelineReport, TicketReport } from "./reportingSchemas";

const PIPELINE_REPORT_KEY = ["crm-report-pipeline"];
const TICKET_REPORT_KEY = ["crm-report-tickets"];

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
  </div>
);

const PipelineValueChart = ({ report }: { report: PipelineReport }) => {
  const openStages = report.stages.filter((stage) => !stage.isWon && !stage.isLost);
  const maxValue = Math.max(...openStages.map((stage) => stage.openValue), 0);

  if (report.totals.openValue === 0 && report.totals.wonValue === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough data yet — add deals to the pipeline to see value by stage.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Open value" value={formatRupees(report.totals.openValue)} />
        <StatTile label="Won value" value={formatRupees(report.totals.wonValue)} />
        <StatTile
          label="Won / lost deals"
          value={`${report.totals.wonDealCount} / ${report.totals.lostDealCount}`}
        />
      </div>

      <ul className="space-y-2">
        {openStages.map((stage) => {
          const widthPercent = maxValue === 0 ? 0 : Math.round((stage.openValue / maxValue) * 100);
          return (
            <li
              key={stage.stageId}
              className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm"
              title={`${stage.stageName}: ${formatRupees(stage.openValue)} across ${stage.openDealCount} open deal${
                stage.openDealCount === 1 ? "" : "s"
              }`}
            >
              <span className="truncate text-muted-foreground">{stage.stageName}</span>
              <span className="h-6 rounded bg-muted">
                <span
                  className="block h-6 rounded bg-primary"
                  style={{ width: `${widthPercent}%` }}
                />
              </span>
              <span className="tabular-nums text-foreground">{formatRupees(stage.openValue)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const TicketDashboard = ({ report }: { report: TicketReport }) => {
  const totalTickets = report.statusCounts.reduce((sum, row) => sum + row.count, 0);

  if (totalTickets === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough data yet — no support tickets have been opened.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Open + in progress" value={String(report.openCount)} />
        <StatTile label="Resolved" value={String(report.resolvedCount)} />
        <StatTile
          label="Mean time to resolve"
          value={formatDuration(report.meanResolutionSeconds)}
        />
      </div>

      <ul className="space-y-2">
        {report.statusCounts.map((row) => {
          const widthPercent =
            totalTickets === 0 ? 0 : Math.round((row.count / totalTickets) * 100);
          return (
            <li
              key={row.status}
              className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 text-sm"
              title={`${row.status.replace("_", " ").toLowerCase()}: ${row.count} ticket${
                row.count === 1 ? "" : "s"
              }`}
            >
              <span className="truncate capitalize text-muted-foreground">
                {row.status.replace("_", " ").toLowerCase()}
              </span>
              <span className="h-6 rounded bg-muted">
                <span
                  className="block h-6 rounded bg-primary"
                  style={{ width: `${widthPercent}%` }}
                />
              </span>
              <span className="tabular-nums text-foreground">{row.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const ReportCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-border bg-card p-5">
    <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

export const ReportsSection = () => {
  const pipeline = useQuery({
    queryKey: PIPELINE_REPORT_KEY,
    queryFn: crmReportingApi.getPipelineReport,
  });
  const tickets = useQuery({
    queryKey: TICKET_REPORT_KEY,
    queryFn: crmReportingApi.getTicketReport,
  });

  return (
    <div className="space-y-6">
      <ReportCard title="Pipeline value by stage">
        {pipeline.isLoading && <Skeleton className="h-40 w-full" />}
        {pipeline.error && <FormBanner>{getErrorMessage(pipeline.error)}</FormBanner>}
        {pipeline.data && <PipelineValueChart report={pipeline.data} />}
      </ReportCard>

      <ReportCard title="Support tickets">
        {tickets.isLoading && <Skeleton className="h-40 w-full" />}
        {tickets.error && <FormBanner>{getErrorMessage(tickets.error)}</FormBanner>}
        {tickets.data && <TicketDashboard report={tickets.data} />}
      </ReportCard>
    </div>
  );
};
