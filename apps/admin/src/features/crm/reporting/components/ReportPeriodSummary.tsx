import {
  Avatar,
  CLICKABLE_STAT_CARD_CLASS_NAME,
  DateInput,
  FilterChip,
  FormBanner,
  StatCard,
  StatCardSkeleton,
  Table,
  type TableColumn,
} from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { MetricEmptyState, MetricSection, StatCardFooterLink } from "@/components/MetricParts";
import { getErrorMessage } from "@/lib/errorMessages";

import { formatDuration, formatRupees } from "../../utils/format.utils";
import { crmReportingApi } from "../api/reportingApi";
import type { CrmPeriodSummary } from "../api/reportingSchemas";
import { REPORT_RANGES, useReportPeriod } from "../hooks/useReportPeriod";
import { TeamMemberPanel } from "./TeamMemberPanel";

const STAT_GRID_CLASS_NAME = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
const STAT_SKELETON_COUNT = 4;
const FIRST_RATE_DEAL = 0;
const PERCENT = 100;

const toWinRate = ({ wonDealCount, lostDealCount }: CrmPeriodSummary["sales"]) => {
  const closedDealCount = wonDealCount + lostDealCount;
  return closedDealCount === FIRST_RATE_DEAL
    ? "—"
    : `${Math.round((wonDealCount / closedDealCount) * PERCENT)}%`;
};

const TEAM_COLUMNS: TableColumn<CrmPeriodSummary["team"][number]>[] = [
  {
    key: "name",
    header: "Team member",
    render: ({ name, avatarUrl }) => (
      <span className="flex items-center gap-2 font-medium">
        <Avatar name={name} imageUrl={avatarUrl} size="sm" />
        {name}
      </span>
    ),
  },
  { key: "won", header: "Sales won", render: ({ wonDealCount }) => wonDealCount.toLocaleString() },
  { key: "value", header: "Value won", render: ({ wonValue }) => formatRupees(wonValue) },
  {
    key: "tickets",
    header: "Tickets solved",
    render: ({ resolvedTicketCount }) => resolvedTicketCount.toLocaleString(),
  },
  {
    key: "tasks",
    header: "Tasks finished",
    render: ({ completedTaskCount }) => completedTaskCount.toLocaleString(),
  },
  {
    key: "activity",
    header: "Calls and notes",
    render: ({ activityCount }) => activityCount.toLocaleString(),
  },
];

const PeriodPicker = ({
  range,
  setRange,
  customFrom,
  customTo,
  setCustomFrom,
  setCustomTo,
}: ReturnType<typeof useReportPeriod>) => (
  <div className="flex flex-wrap items-center gap-2">
    {REPORT_RANGES.map(({ value, label }) => (
      <FilterChip key={value} isSelected={range === value} onClick={() => setRange(value)}>
        {label}
      </FilterChip>
    ))}
    {range === "custom" && (
      <>
        <DateInput
          aria-label="From date"
          max={customTo}
          value={customFrom}
          onChange={(event) => setCustomFrom(event.target.value)}
          className="w-40"
        />
        <DateInput
          aria-label="To date"
          min={customFrom}
          value={customTo}
          onChange={(event) => setCustomTo(event.target.value)}
          className="w-40"
        />
      </>
    )}
  </div>
);

const SalesStats = ({ sales }: { sales: CrmPeriodSummary["sales"] }) => (
  <MetricSection title="Sales" description="Opportunities opened and closed in this period.">
    <div className={STAT_GRID_CLASS_NAME}>
      <StatCard
        label="New opportunities"
        value={sales.newDealCount.toLocaleString()}
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        footer={<StatCardFooterLink to="/crm/pipeline" period="Open the sales board" />}
      />
      <StatCard label="Won" value={sales.wonDealCount.toLocaleString()} />
      <StatCard label="Value won" value={formatRupees(sales.wonValue)} />
      <StatCard
        label="Win rate"
        value={toWinRate(sales)}
        hint="Of the opportunities closed in this period, how many were won."
      />
    </div>
  </MetricSection>
);

const SupportStats = ({
  support,
  dateFrom,
  dateTo,
}: {
  support: CrmPeriodSummary["support"];
  dateFrom: string;
  dateTo: string;
}) => (
  <MetricSection title="Support" description="Tickets opened and solved in this period.">
    <div className={STAT_GRID_CLASS_NAME}>
      <StatCard
        label="Tickets opened"
        value={support.openedCount.toLocaleString()}
        className={CLICKABLE_STAT_CARD_CLASS_NAME}
        footer={
          <StatCardFooterLink
            to="/crm/support"
            search={{ from: dateFrom, to: dateTo }}
            period="See these tickets"
          />
        }
      />
      <StatCard label="Tickets solved" value={support.resolvedCount.toLocaleString()} />
      <StatCard
        label="Average time to solve"
        value={formatDuration(support.meanResolutionSeconds)}
      />
    </div>
  </MetricSection>
);

const TeamStats = ({ team }: { team: CrmPeriodSummary["team"] }) => {
  const [selectedMember, setSelectedMember] = useState<CrmPeriodSummary["team"][number] | null>(
    null,
  );

  return (
    <MetricSection
      title="Team"
      description="What each person finished in this period. Click someone for details."
    >
      {team.length === 0 ? (
        <MetricEmptyState>No team members to show yet.</MetricEmptyState>
      ) : (
        <Table
          caption="What each team member finished"
          columns={TEAM_COLUMNS}
          rows={team}
          rowKey={({ membershipId }) => membershipId}
          onRowClick={setSelectedMember}
        />
      )}
      {selectedMember && (
        <TeamMemberPanel member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </MetricSection>
  );
};

export const ReportPeriodSummary = () => {
  const reportPeriod = useReportPeriod();
  const { period, dateFrom, dateTo } = reportPeriod;

  const {
    data: summary,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-report-summary", dateFrom, dateTo],
    queryFn: () => crmReportingApi.getPeriodSummary(period ?? { from: "", to: "" }),
    enabled: period !== null,
  });

  return (
    <div className="space-y-4">
      <PeriodPicker {...reportPeriod} />

      {!period && (
        <MetricEmptyState>Pick a start and end date to see this report.</MetricEmptyState>
      )}
      {error && <FormBanner>{getErrorMessage(error)}</FormBanner>}
      {isLoading && (
        <div className={STAT_GRID_CLASS_NAME} role="status" aria-label="Loading">
          {Array.from({ length: STAT_SKELETON_COUNT }, (_unused, statIndex) => (
            <StatCardSkeleton key={statIndex} />
          ))}
        </div>
      )}

      {summary && (
        <>
          <SalesStats sales={summary.sales} />
          <SupportStats support={summary.support} dateFrom={dateFrom} dateTo={dateTo} />
          <TeamStats team={summary.team} />
        </>
      )}
    </div>
  );
};
