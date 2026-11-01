import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { MetricEmptyState, MetricLinkRow, MetricSection } from "@/components/MetricParts";

import { toTaskDueRange } from "../../activities/utils/taskDue.utils";
import { UNASSIGNED_FILTER } from "../../components/CrmMemberFilter";
import { STUCK_DEAL_DAYS, STUCK_FILTER_VALUE } from "../../pipeline/constants/stuckDeals";
import { crmReportingApi } from "../api/reportingApi";
import type { CrmAttentionReport } from "../api/reportingSchemas";

const NOTHING_WAITING = 0;
const SINGLE_ITEM = 1;

const toCountLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === SINGLE_ITEM ? singular : plural}`;

const toAttentionRows = ({
  overdueTaskCount,
  tasksDueTodayCount,
  unassignedTicketCount,
  stuckDealCount,
}: CrmAttentionReport) => [
  {
    key: "overdue",
    count: overdueTaskCount,
    label: toCountLabel(overdueTaskCount, "overdue task", "overdue tasks"),
    detail: "These are past their due date.",
    to: "/crm/tasks",
    search: { due: "overdue" },
  },
  {
    key: "today",
    count: tasksDueTodayCount,
    label: toCountLabel(tasksDueTodayCount, "task due today", "tasks due today"),
    detail: "Finish these before the day ends.",
    to: "/crm/tasks",
    search: { due: "today" },
  },
  {
    key: "tickets",
    count: unassignedTicketCount,
    label: toCountLabel(
      unassignedTicketCount,
      "ticket with no one on it",
      "tickets with no one on them",
    ),
    detail: "Give each one to someone on your team.",
    to: "/crm/support",
    search: { status: "ACTIVE", assignee: UNASSIGNED_FILTER },
  },
  {
    key: "deals",
    count: stuckDealCount,
    label: toCountLabel(stuckDealCount, "opportunity not moving", "opportunities not moving"),
    detail: `In the same stage for ${STUCK_DEAL_DAYS} days or more.`,
    to: "/crm/pipeline",
    search: { stuck: STUCK_FILTER_VALUE },
  },
];

export const CrmAttentionSection = () => {
  const {
    data: attention,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["crm-report-attention"],
    queryFn: () => {
      const { dueFrom, dueTo } = toTaskDueRange("today");
      return crmReportingApi.getAttentionReport({ dayStart: dueFrom ?? "", dayEnd: dueTo ?? "" });
    },
  });
  const waitingRows = attention
    ? toAttentionRows(attention).filter(({ count }) => count > NOTHING_WAITING)
    : [];

  return (
    <MetricSection title="Needs attention today" description="The things most likely to slip.">
      {isLoading && <Skeleton className="h-10 w-full" />}
      {error && <MetricEmptyState>This list is unavailable right now.</MetricEmptyState>}
      {attention && waitingRows.length === 0 && (
        <MetricEmptyState>Nothing needs attention today. Nice work.</MetricEmptyState>
      )}
      {waitingRows.map(({ key, label, detail, to, search }) => (
        <MetricLinkRow key={key} to={to} search={search} label={label} detail={detail} value="" />
      ))}
    </MetricSection>
  );
};
