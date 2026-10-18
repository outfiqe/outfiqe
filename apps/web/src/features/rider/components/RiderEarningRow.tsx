import { Badge } from "@outfiqe/design-system";

import { formatLakhAmount, formatNepalDateTime } from "@/shared/lib/nepalFormatting";

import type { RiderEarning } from "../api/riderEarningsSchemas";
import {
  RIDER_EARNING_KIND_LABELS,
  RIDER_EARNING_STATUS_LABELS,
} from "../constants/riderEarningLabels";

const RIDER_DATE_LOCALE = "en";
const SINGLE_STOP = 1;

type RiderEarningRowProps = { earning: RiderEarning };

const describeStops = ({ kind, stopCount }: RiderEarning) => {
  if (kind === "WASTED_VISIT") return RIDER_EARNING_KIND_LABELS.WASTED_VISIT;
  return stopCount === SINGLE_STOP ? "1 bag" : `${stopCount} bags`;
};

export const RiderEarningRow = ({ earning }: RiderEarningRowProps) => (
  <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">
        {earning.brandName} · {earning.pickupLocationLabel}
      </p>
      <p className="text-sm text-muted-foreground">
        {describeStops(earning)} · {formatNepalDateTime(earning.earnedAt, RIDER_DATE_LOCALE)}
      </p>
      {earning.status === "PENDING" && (
        <p className="text-xs text-muted-foreground">
          Ready to withdraw from {formatNepalDateTime(earning.releasesAt, RIDER_DATE_LOCALE)}
        </p>
      )}
      {earning.voidReason && (
        <p className="text-xs text-muted-foreground">Cancelled: {earning.voidReason}</p>
      )}
    </div>
    <div className="shrink-0 text-right">
      <p className="font-semibold text-foreground">Rs. {formatLakhAmount(earning.amount)}</p>
      <Badge tone={earning.status === "VOIDED" ? "negative" : "neutral"} showDot={false}>
        {RIDER_EARNING_STATUS_LABELS[earning.status]}
      </Badge>
    </div>
  </div>
);
