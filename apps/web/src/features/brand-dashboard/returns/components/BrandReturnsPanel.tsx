"use client";

import { Badge, Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { formatNepalDateTime } from "@/shared/lib/nepalFormatting";

import type { BrandReturn } from "../api/brandReturnSchemas";
import {
  BRAND_RETURN_SOURCE_LABELS,
  BRAND_RETURN_STATUS_LABELS,
} from "../constants/brandReturnLabels";
import { useBrandReturns } from "../hooks/useBrandReturns";
import { useConfirmBrandReturn } from "../hooks/useConfirmBrandReturn";

const NO_RETURNS = 0;
const NO_UNITS = 0;
const SHORT_ORDER_ID_LENGTH = 8;
const ENGLISH_LOCALE = "en";
const AWAITING_CONFIRMATION: BrandReturn["status"] = "DROPPED_OFF";
const RECEIVED: BrandReturn["status"] = "CONFIRMED";

const describeLine = ({
  productName,
  sizeLabel,
  resellableQty,
  damagedQty,
}: BrandReturn["lines"][number]) =>
  [
    `${productName} · ${sizeLabel}`,
    resellableQty > NO_UNITS ? `${resellableQty} fine` : null,
    damagedQty > NO_UNITS ? `${damagedQty} damaged` : null,
  ]
    .filter(Boolean)
    .join(" · ");

export const BrandReturnsPanel = () => {
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useBrandReturns();
  const confirmReturn = useConfirmBrandReturn();
  const brandReturns = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section
      aria-labelledby="brand-returns-heading"
      className="mt-6 rounded-2xl border border-border p-5"
    >
      <h2
        id="brand-returns-heading"
        className="font-display text-sm font-bold uppercase tracking-wide text-foreground"
      >
        Returns coming back to you
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Items our rider brings back. Confirm when you have them; items in good condition go back
        into your stock. If you don&apos;t confirm within 48 hours, we confirm for you.
      </p>

      {isError && (
        <div className="mt-3">
          <FormBanner>We couldn&apos;t load your returns. Please try again.</FormBanner>
        </div>
      )}
      {isPending && !isError && <Skeleton className="mt-3 h-16 w-full rounded-xl" />}
      {!isPending && !isError && brandReturns.length === NO_RETURNS && (
        <p className="mt-3 text-sm text-muted-foreground">No returns right now.</p>
      )}

      {brandReturns.length > NO_RETURNS && (
        <ul className="mt-3 divide-y divide-border">
          {brandReturns.map((brandReturn) => {
            const { id, orderId, source, status, lines, droppedOffAt, isAutoConfirmed } =
              brandReturn;
            return (
              <li key={id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    Order #{orderId.slice(0, SHORT_ORDER_ID_LENGTH).toUpperCase()} ·{" "}
                    {BRAND_RETURN_SOURCE_LABELS[source]}
                  </p>
                  <Badge tone={status === RECEIVED ? "positive" : "neutral"} showDot={false}>
                    {status === RECEIVED && isAutoConfirmed
                      ? "Received (confirmed automatically)"
                      : BRAND_RETURN_STATUS_LABELS[status]}
                  </Badge>
                </div>
                <ul className="text-xs text-muted-foreground">
                  {lines.map((line) => (
                    <li key={`${line.productName}-${line.sizeLabel}`}>{describeLine(line)}</li>
                  ))}
                </ul>
                {droppedOffAt && (
                  <p className="text-xs text-muted-foreground">
                    Handed over{" "}
                    <time dateTime={droppedOffAt}>
                      {formatNepalDateTime(droppedOffAt, ENGLISH_LOCALE)}
                    </time>
                  </p>
                )}
                {status === AWAITING_CONFIRMATION && (
                  <Button
                    size="sm"
                    onClick={() => confirmReturn.mutate(id)}
                    isLoading={confirmReturn.isPending && confirmReturn.variables === id}
                  >
                    Confirm received
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void fetchNextPage()}
          isLoading={isFetchingNextPage}
        >
          Show more
        </Button>
      )}
    </section>
  );
};
