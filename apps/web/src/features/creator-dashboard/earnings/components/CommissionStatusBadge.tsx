import { cn } from "@/shared/lib/cn";

import { CommissionStatus, type CommissionStatusValue } from "../api/commissionSchemas";

const GOOD_STATUSES = new Set<CommissionStatusValue>([
  CommissionStatus.AVAILABLE,
  CommissionStatus.PAID,
]);
const WARN_STATUSES = new Set<CommissionStatusValue>([
  CommissionStatus.PENDING,
  CommissionStatus.APPROVED,
]);
const BAD_STATUSES = new Set<CommissionStatusValue>([CommissionStatus.VOIDED]);

type CommissionStatusBadgeProps = {
  status: CommissionStatusValue;
};

export const CommissionStatusBadge = ({ status }: CommissionStatusBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        GOOD_STATUSES.has(status) && "bg-green-100 text-green-800",
        WARN_STATUSES.has(status) && "bg-amber-100 text-amber-800",
        BAD_STATUSES.has(status) && "bg-red-100 text-red-800",
      )}
    >
      {status}
    </span>
  );
};
