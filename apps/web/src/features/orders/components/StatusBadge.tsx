import { cn } from "@/shared/lib/cn";

const GOOD_STATUSES = new Set(["PAID", "DELIVERED"]);
const WARN_STATUSES = new Set(["DUE", "PLACED", "PACKED"]);
const INFO_STATUSES = new Set(["SHIPPED"]);
const BAD_STATUSES = new Set(["FAILED", "CANCELLED"]);

type StatusBadgeProps = {
  status: string;
  label?: string;
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide",
        GOOD_STATUSES.has(status) && "bg-green-100 text-green-800",
        WARN_STATUSES.has(status) && "bg-amber-100 text-amber-800",
        INFO_STATUSES.has(status) && "bg-blue-100 text-blue-800",
        BAD_STATUSES.has(status) && "bg-red-100 text-red-800",
      )}
    >
      {label ?? status}
    </span>
  );
};
