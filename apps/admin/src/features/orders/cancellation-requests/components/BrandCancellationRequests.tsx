import { Button, ConfirmModal, Skeleton } from "@outfiqe/design-system";
import { formatDateTime } from "@outfiqe/utils";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import type { CancellationRequest } from "../api/cancellationRequestsSchemas";
import { CANCELLATION_REJECTION_NOTE_MIN_LENGTH } from "../constants/cancellationRequestLabels";
import { useDecideCancellationRequest } from "../hooks/useDecideCancellationRequest";
import { useInfiniteCancellationRequests } from "../hooks/useInfiniteCancellationRequests";

const SHORT_ORDER_ID_LENGTH = 8;
const ROW_SKELETON_COUNT = 2;
const NO_REQUESTS = 0;

const toShortOrderId = (orderId: string) => orderId.slice(0, SHORT_ORDER_ID_LENGTH).toUpperCase();

const validateRejectionNote = (trimmedValue: string) =>
  trimmedValue.length < CANCELLATION_REJECTION_NOTE_MIN_LENGTH ? "Tell the brand why." : null;

export const BrandCancellationRequests = () => {
  const { canUse } = usePlatformPermissions();
  const canManageOrders = canUse(PLATFORM_MANAGE_PERMISSION.ORDERS);
  const {
    data: requestPages,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteCancellationRequests();
  const decide = useDecideCancellationRequest();
  const [requestBeingApproved, setRequestBeingApproved] = useState<CancellationRequest | null>(
    null,
  );
  const [requestBeingRejected, setRequestBeingRejected] = useState<CancellationRequest | null>(
    null,
  );
  const requests = requestPages?.pages.flatMap((page) => page.items) ?? [];

  const confirmApproval = () => {
    if (!requestBeingApproved) return;
    decide.mutate(
      { fulfilmentGroupId: requestBeingApproved.fulfilmentGroupId, isApproved: true },
      { onSettled: () => setRequestBeingApproved(null) },
    );
  };

  const confirmRejection = (note: string) => {
    if (!requestBeingRejected) return;
    decide.mutate(
      { fulfilmentGroupId: requestBeingRejected.fulfilmentGroupId, isApproved: false, note },
      { onSuccess: () => setRequestBeingRejected(null) },
    );
  };

  return (
    <section aria-labelledby="brand-cancellation-requests-heading" className="mt-6">
      <h2
        id="brand-cancellation-requests-heading"
        className="font-display text-lg font-bold text-foreground"
      >
        Shipments brands want to cancel
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Approving refunds the customer for everything left in that shipment and cancels it.
        Declining lets the brand carry on.
      </p>

      <div className="mt-3 space-y-3">
        {isLoading &&
          Array.from({ length: ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
            <Skeleton key={rowIndex} className="h-28 w-full rounded-xl" />
          ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t load cancellation requests.
          </p>
        )}
        {!isLoading && !error && requests.length === NO_REQUESTS && (
          <p className="text-sm text-muted-foreground">No cancellation requests right now.</p>
        )}

        {requests.map((request) => {
          const { fulfilmentGroupId, orderId, brandName, reason, requestedAt, remainingAmount } =
            request;
          return (
            <article
              key={fulfilmentGroupId}
              className="rounded-xl border border-border bg-card p-4"
            >
              <h3 className="font-display text-base font-bold text-foreground">
                Order #{toShortOrderId(orderId)} · {brandName}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Rs. {remainingAmount.toLocaleString()} left to refund · asked{" "}
                {formatDateTime(requestedAt)}
              </p>
              <ul className="mt-2 space-y-0.5 text-sm text-foreground">
                {request.items.map((item) => (
                  <li key={item.orderItemId}>
                    {item.productName} · {item.sizeLabel} × {item.qty - item.refundedQty}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-foreground">Reason: {reason}</p>
              <Link
                to="/orders/$orderId"
                params={{ orderId }}
                className="mt-1 inline-block text-sm font-medium text-foreground underline"
              >
                Open order
              </Link>
              {canManageOrders && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setRequestBeingApproved(request)}
                    disabled={decide.isPending}
                  >
                    Approve and refund
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRequestBeingRejected(request)}
                    disabled={decide.isPending}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </article>
          );
        })}

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

      <ConfirmModal
        open={requestBeingApproved !== null}
        title="Cancel this shipment and refund?"
        description={
          requestBeingApproved
            ? `Refund Rs. ${requestBeingApproved.remainingAmount.toLocaleString()} to the customer for ${requestBeingApproved.brandName}'s part of order #${toShortOrderId(requestBeingApproved.orderId)}. This cannot be undone.`
            : undefined
        }
        confirmLabel="Approve and refund"
        pendingLabel="Refunding…"
        destructive
        isPending={decide.isPending}
        onConfirm={confirmApproval}
        onCancel={() => setRequestBeingApproved(null)}
      />

      <TextPromptModal
        key={requestBeingRejected?.fulfilmentGroupId ?? "none"}
        open={requestBeingRejected !== null}
        title="Decline cancellation"
        label="Note for the brand"
        validate={validateRejectionNote}
        confirmLabel="Decline"
        pendingLabel="Saving…"
        isPending={decide.isPending}
        onConfirm={confirmRejection}
        onCancel={() => setRequestBeingRejected(null)}
      />
    </section>
  );
};
