import {
  Badge,
  Button,
  FilterChip,
  FormBanner,
  Table,
  type TableColumn,
} from "@outfiqe/design-system";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";

import {
  RIDER_EARNING_STATUSES,
  type RiderEarning,
  type RiderEarningStatus,
} from "../api/riderPaySchemas";
import {
  RIDER_EARNING_STATUS_LABELS,
  VOIDABLE_EARNING_STATUSES,
} from "../constants/riderPayLabels";
import { useInfiniteRiderEarnings } from "../hooks/useInfiniteRiderEarnings";
import { useVoidRiderEarning } from "../hooks/useVoidRiderEarning";
import { formatPayAmount, formatPayDate } from "../utils/riderPay.utils";

const MIN_VOID_REASON_LENGTH = 5;
const SINGLE_BAG = 1;

const describeVisit = ({ kind, stopCount }: RiderEarning) => {
  if (kind === "WASTED_VISIT") return "Wasted visit";
  return stopCount === SINGLE_BAG ? "1 bag" : `${stopCount} bags`;
};

type RiderEarningsSectionProps = { canManage: boolean };

export const RiderEarningsSection = ({ canManage }: RiderEarningsSectionProps) => {
  const [statusFilter, setStatusFilter] = useState<RiderEarningStatus | null>(null);
  const [earningToVoid, setEarningToVoid] = useState<RiderEarning | null>(null);
  const earningsQuery = useInfiniteRiderEarnings(statusFilter);
  const voidEarning = useVoidRiderEarning();
  const earnings = earningsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  const earningColumns: TableColumn<RiderEarning>[] = [
    {
      key: "rider",
      header: "Rider",
      render: ({ riderName, earnedAt }) => (
        <div>
          <p className="font-medium text-foreground">{riderName}</p>
          <p className="text-xs text-muted-foreground">{formatPayDate(earnedAt)}</p>
        </div>
      ),
    },
    {
      key: "visit",
      header: "Visit",
      render: (earning) => (
        <div>
          <p className="text-foreground">
            {earning.brandName} · {earning.pickupLocationLabel}
          </p>
          <p className="text-xs text-muted-foreground">{describeVisit(earning)}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: ({ status, voidReason }) => (
        <div className="space-y-1">
          <Badge tone={status === "VOIDED" ? "negative" : "neutral"} showDot={false}>
            {RIDER_EARNING_STATUS_LABELS[status]}
          </Badge>
          {voidReason && <p className="text-xs text-muted-foreground">{voidReason}</p>}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (earning) => (
        <div className="space-y-1">
          <p className="font-medium text-foreground">{formatPayAmount(earning.amount)}</p>
          {canManage && VOIDABLE_EARNING_STATUSES.has(earning.status) && (
            <Button size="sm" variant="outline" onClick={() => setEarningToVoid(earning)}>
              Void
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-3" aria-labelledby="rider-earnings-heading">
      <h2 id="rider-earnings-heading" className="text-lg font-semibold text-foreground">
        Earnings
      </h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter earnings by status">
        <FilterChip isSelected={statusFilter === null} onClick={() => setStatusFilter(null)}>
          All
        </FilterChip>
        {RIDER_EARNING_STATUSES.map((status) => (
          <FilterChip
            key={status}
            isSelected={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          >
            {RIDER_EARNING_STATUS_LABELS[status]}
          </FilterChip>
        ))}
      </div>
      {earningsQuery.isError && <FormBanner>We couldn&apos;t load rider earnings.</FormBanner>}
      <Table
        caption="Contractor rider earnings"
        columns={earningColumns}
        rows={earnings}
        rowKey={({ id }) => id}
        isLoading={earningsQuery.isPending}
        emptyState="No earnings here yet."
      />
      {earningsQuery.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void earningsQuery.fetchNextPage()}
          isLoading={earningsQuery.isFetchingNextPage}
        >
          Show more earnings
        </Button>
      )}
      <TextPromptModal
        open={earningToVoid !== null}
        title="Void this earning"
        description="The rider won't be paid for this visit. Use it for a visit that didn't really happen."
        label="Reason"
        validate={(trimmedReason) =>
          trimmedReason.length < MIN_VOID_REASON_LENGTH
            ? "Write at least a few words so the rider and team know why."
            : null
        }
        confirmLabel="Void earning"
        pendingLabel="Voiding…"
        isPending={voidEarning.isPending}
        onConfirm={(reason) => {
          if (!earningToVoid) return;
          voidEarning.mutate(
            { earningId: earningToVoid.id, reason },
            { onSuccess: () => setEarningToVoid(null) },
          );
        }}
        onCancel={() => setEarningToVoid(null)}
      />
    </section>
  );
};
