import { MetricRow } from "@/components/MetricParts";

import { formatRupees } from "../../utils/format.utils";
import type { CrmPeriodSummary } from "../api/reportingSchemas";

export const TeamMemberWork = ({
  title,
  member,
}: {
  title: string;
  member: CrmPeriodSummary["team"][number];
}) => (
  <div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <MetricRow label="Sales won" value={member.wonDealCount.toLocaleString()} />
    <MetricRow label="Value won" value={formatRupees(member.wonValue)} />
    <MetricRow label="Tickets solved" value={member.resolvedTicketCount.toLocaleString()} />
    <MetricRow label="Tasks finished" value={member.completedTaskCount.toLocaleString()} />
    <MetricRow label="Calls and notes" value={member.activityCount.toLocaleString()} />
  </div>
);
