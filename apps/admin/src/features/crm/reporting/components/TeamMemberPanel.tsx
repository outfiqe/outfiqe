import { Avatar, Drawer, DrawerScrollArea } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import { MetricRow } from "@/components/MetricParts";

import { useCrmMembers } from "../../hooks/useCrmMembers";
import { formatDate, formatRupees } from "../../utils/format.utils";
import type { CrmPeriodSummary } from "../api/reportingSchemas";

export const TeamMemberPanel = ({
  member,
  onClose,
}: {
  member: CrmPeriodSummary["team"][number];
  onClose: () => void;
}) => {
  const { membershipId, name, avatarUrl, roleName, joinedAt } = member;
  const email = useCrmMembers()?.find(({ id }) => id === membershipId)?.userEmail;

  return (
    <Drawer
      open
      onClose={onClose}
      title={name}
      footer={
        <div className="px-5 py-3">
          <Link
            to="/crm"
            className="text-sm font-medium text-foreground underline underline-offset-4"
          >
            See your team
          </Link>
        </div>
      }
    >
      <DrawerScrollArea className="space-y-5 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={name} imageUrl={avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{name}</p>
            <p className="text-sm text-muted-foreground">{roleName}</p>
          </div>
        </div>

        <div>
          {email && <MetricRow label="Email" hasLongValue value={email} />}
          <MetricRow label="Joined" value={formatDate(joinedAt)} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground">In this period</h3>
          <MetricRow label="Sales won" value={member.wonDealCount.toLocaleString()} />
          <MetricRow label="Value won" value={formatRupees(member.wonValue)} />
          <MetricRow label="Tickets solved" value={member.resolvedTicketCount.toLocaleString()} />
          <MetricRow label="Tasks finished" value={member.completedTaskCount.toLocaleString()} />
          <MetricRow label="Calls and notes" value={member.activityCount.toLocaleString()} />
        </div>
      </DrawerScrollArea>
    </Drawer>
  );
};
