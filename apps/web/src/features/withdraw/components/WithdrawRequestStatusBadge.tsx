import { cn } from "@/shared/lib/cn";

import { RequestStatus, type RequestStatusValue } from "../api/withdrawSchemas";

const GOOD_STATUSES = new Set<RequestStatusValue>([RequestStatus.PAID]);
const WARN_STATUSES = new Set<RequestStatusValue>([
  RequestStatus.PENDING,
  RequestStatus.UNDER_REVIEW,
  RequestStatus.APPROVED,
]);
const BAD_STATUSES = new Set<RequestStatusValue>([RequestStatus.REJECTED]);

const LABEL: Record<RequestStatusValue, string> = {
  [RequestStatus.PENDING]: "Pending",
  [RequestStatus.UNDER_REVIEW]: "Under review",
  [RequestStatus.APPROVED]: "Approved",
  [RequestStatus.PAID]: "Paid",
  [RequestStatus.REJECTED]: "Rejected",
};

type WithdrawRequestStatusBadgeProps = {
  status: RequestStatusValue;
};

export const WithdrawRequestStatusBadge = ({ status }: WithdrawRequestStatusBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        GOOD_STATUSES.has(status) && "bg-green-100 text-green-800",
        WARN_STATUSES.has(status) && "bg-amber-100 text-amber-800",
        BAD_STATUSES.has(status) && "bg-red-100 text-red-800",
      )}
    >
      {LABEL[status]}
    </span>
  );
};
