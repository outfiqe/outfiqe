import { Button, Skeleton } from "@outfiqe/design-system";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import type { RefundQueueItem } from "../api/refundsSchemas";
import { TRANSFER_REFERENCE_MIN_LENGTH } from "../constants/refundLabels";
import { useInfiniteRefundQueue } from "../hooks/useInfiniteRefundQueue";
import { useMarkRefundPaid } from "../hooks/useMarkRefundPaid";
import { RefundQueueCard } from "./RefundQueueCard";

const REFUND_ROW_SKELETON_COUNT = 4;
const NO_REFUNDS = 0;

const validateTransferReference = (trimmedValue: string) =>
  trimmedValue.length < TRANSFER_REFERENCE_MIN_LENGTH
    ? "Enter the reference from your bank or wallet transfer."
    : null;

export const RefundQueuePage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageOrders = canUse(PLATFORM_MANAGE_PERMISSION.ORDERS);
  const {
    data: refundQueue,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteRefundQueue();
  const markPaid = useMarkRefundPaid();
  const [refundBeingPaid, setRefundBeingPaid] = useState<RefundQueueItem | null>(null);
  const refunds = refundQueue?.pages.flatMap((page) => page.items) ?? [];

  const confirmRefundPaid = (transferReference: string) => {
    if (!refundBeingPaid) return;
    markPaid.mutate(
      { refundId: refundBeingPaid.id, transferReference },
      { onSuccess: () => setRefundBeingPaid(null) },
    );
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Refunds to pay</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Refunds that couldn&apos;t go back automatically. Send the money, then mark each one paid
        with the transfer reference.
      </p>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: REFUND_ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
            <Skeleton key={rowIndex} className="h-36 w-full rounded-xl" />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load refunds.</p>}
        {!isLoading && !error && refunds.length === NO_REFUNDS && (
          <p className="text-sm text-muted-foreground">No refunds waiting to be paid.</p>
        )}

        {refunds.map((refund) => (
          <RefundQueueCard
            key={refund.id}
            refund={refund}
            canManage={canManageOrders}
            onMarkPaid={setRefundBeingPaid}
          />
        ))}

        {hasNextPage && (
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            isLoading={isFetchingNextPage}
            className="mx-auto"
          >
            Load more
          </Button>
        )}
      </div>

      <TextPromptModal
        key={refundBeingPaid?.id ?? "none"}
        open={refundBeingPaid !== null}
        title="Mark refund as paid"
        description={
          refundBeingPaid
            ? `Confirm you sent Rs. ${refundBeingPaid.totalAmount.toLocaleString()} to ${refundBeingPaid.customerName}.`
            : undefined
        }
        label="Transfer reference"
        validate={validateTransferReference}
        confirmLabel="Mark as paid"
        pendingLabel="Saving…"
        isPending={markPaid.isPending}
        onConfirm={confirmRefundPaid}
        onCancel={() => setRefundBeingPaid(null)}
      />
    </div>
  );
};
