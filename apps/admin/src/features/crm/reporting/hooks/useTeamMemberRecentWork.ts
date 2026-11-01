import { useQuery } from "@tanstack/react-query";

import { toDayRange } from "../../activities/utils/taskDue.utils";
import { useCrmPermissions } from "../../hooks/useCrmPermissions";
import { crmReportingApi } from "../api/reportingApi";
import { toPresetDates } from "./useReportPeriod";

export const RECENT_WORK_DAYS = 30;
const REPORTS_READ_PERMISSION_KEY = "reports:read";

export const useTeamMemberRecentWork = (membershipId: string | undefined) => {
  const { hasPermission } = useCrmPermissions();
  const { dateFrom, dateTo } = toPresetDates(RECENT_WORK_DAYS, new Date());
  const from = toDayRange(dateFrom, "start");
  const to = toDayRange(dateTo, "end");

  const { data: summary } = useQuery({
    queryKey: ["crm-team-member-recent-work", dateFrom, dateTo],
    queryFn: () => crmReportingApi.getPeriodSummary({ from: from ?? "", to: to ?? "" }),
    enabled: Boolean(membershipId && from && to) && hasPermission(REPORTS_READ_PERMISSION_KEY),
  });

  return summary?.team.find((teamMember) => teamMember.membershipId === membershipId);
};
