import { Badge, Button, Skeleton } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { TextPromptModal } from "@/components/TextPromptModal";
import { usePlatformPermissions } from "@/features/auth/hooks/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";
import { oneOfFilter, useSearchFilter } from "@/lib/useSearchFilter";

import {
  UNAVAILABLE_ITEM_STATUSES,
  type UnavailableItemRequest,
  type UnavailableItemStatus,
} from "../api/unavailableItemsSchemas";
import {
  REJECTION_NOTE_MIN_LENGTH,
  UNAVAILABLE_ITEM_STATUS_LABELS,
} from "../constants/unavailableItemLabels";
import { useDecideUnavailableItem } from "../hooks/useDecideUnavailableItem";
import { useInfiniteUnavailableItems } from "../hooks/useInfiniteUnavailableItems";

const [DEFAULT_STATUS] = UNAVAILABLE_ITEM_STATUSES;
const UNAVAILABLE_STATUS_FILTER = oneOfFilter<UnavailableItemStatus>(
  [...UNAVAILABLE_ITEM_STATUSES],
  DEFAULT_STATUS,
);
const AWAITING_REVIEW_STATUS: UnavailableItemStatus = "PENDING";
const ROW_SKELETON_COUNT = 4;
const NO_REQUESTS = 0;

const STATUS_TONE: Record<UnavailableItemStatus, "neutral" | "positive" | "negative"> = {
  PENDING: "neutral",
  APPROVED: "positive",
  REJECTED: "negative",
};

const validateRejectionNote = (trimmedValue: string) =>
  trimmedValue.length < REJECTION_NOTE_MIN_LENGTH ? "Tell the brand why." : null;

export const UnavailableItemsPage = () => {
  const { canUse } = usePlatformPermissions();
  const canManageOrders = canUse(PLATFORM_MANAGE_PERMISSION.ORDERS);
  const [status, setStatus] = useSearchFilter("status", UNAVAILABLE_STATUS_FILTER);
  const {
    data: unavailableItemPages,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteUnavailableItems(status);
  const decide = useDecideUnavailableItem();
  const [requestBeingRejected, setRequestBeingRejected] = useState<UnavailableItemRequest | null>(
    null,
  );
  const requests = unavailableItemPages?.pages.flatMap((page) => page.items) ?? [];

  const confirmRejection = (note: string) => {
    if (!requestBeingRejected) return;
    decide.mutate(
      { requestId: requestBeingRejected.id, isApproved: false, note },
      { onSuccess: () => setRequestBeingRejected(null) },
    );
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">
        Items brands can&apos;t supply
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Approving refunds the customer for those units. Rejecting tells the brand to send them.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {UNAVAILABLE_ITEM_STATUSES.map((tabStatus) => (
          <button
            key={tabStatus}
            type="button"
            onClick={() => setStatus(tabStatus)}
            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tabStatus
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {UNAVAILABLE_ITEM_STATUS_LABELS[tabStatus]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading &&
          Array.from({ length: ROW_SKELETON_COUNT }, (_unused, rowIndex) => (
            <Skeleton key={rowIndex} className="h-28 w-full rounded-xl" />
          ))}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load reports.</p>}
        {!isLoading && !error && requests.length === NO_REQUESTS && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {requests.map((request) => {
          const {
            id,
            orderId,
            brandName,
            productName,
            sizeLabel,
            qty,
            unitPrice,
            reason,
            decisionNote,
            createdAt,
          } = request;
          const isAwaitingReview = request.status === AWAITING_REVIEW_STATUS;
          return (
            <article key={id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    {brandName}: {productName} · {sizeLabel} × {qty}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rs. {(unitPrice * qty).toLocaleString()} ·{" "}
                    {new Date(createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-foreground">{reason}</p>
                  {decisionNote && (
                    <p className="text-sm text-muted-foreground">Our note: {decisionNote}</p>
                  )}
                  <Link
                    to="/orders/$orderId"
                    params={{ orderId }}
                    className="mt-1 inline-block text-sm font-medium text-foreground underline"
                  >
                    Open order
                  </Link>
                </div>
                <Badge tone={STATUS_TONE[request.status]} showDot={false}>
                  {UNAVAILABLE_ITEM_STATUS_LABELS[request.status]}
                </Badge>
              </div>
              {canManageOrders && isAwaitingReview && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ requestId: id, isApproved: true })}
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
                    Reject
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

      <TextPromptModal
        key={requestBeingRejected?.id ?? "none"}
        open={requestBeingRejected !== null}
        title="Reject report"
        label="Note for the brand"
        validate={validateRejectionNote}
        confirmLabel="Reject"
        pendingLabel="Saving…"
        isPending={decide.isPending}
        onConfirm={confirmRejection}
        onCancel={() => setRequestBeingRejected(null)}
      />
    </div>
  );
};
