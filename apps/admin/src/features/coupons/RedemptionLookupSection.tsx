import { Badge, Button } from "@outfiqe/design-system";
import { useState } from "react";

import { useInfiniteRedemptions } from "./hooks/useInfiniteRedemptions";

const STATUS_TONE = {
  CONSUMED: "positive",
  RELEASED: "negative",
} as const;

export const RedemptionLookupSection = () => {
  const [codeInput, setCodeInput] = useState("");
  const [orderIdInput, setOrderIdInput] = useState("");
  const [filters, setFilters] = useState<{ code?: string; orderId?: string } | null>(null);

  const {
    data: redemptionsQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteRedemptions(filters ?? {}, filters !== null);
  const redemptions = redemptionsQuery?.pages.flatMap((page) => page.redemptions) ?? [];

  const search = () => {
    const code = codeInput.trim();
    const orderId = orderIdInput.trim();
    if (!code && !orderId) return;
    setFilters({ code: code || undefined, orderId: orderId || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="lookup-code">
            Coupon code
          </label>
          <input
            id="lookup-code"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="WELCOME300"
            className="h-11 w-48 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor="lookup-order-id"
          >
            Order ID
          </label>
          <input
            id="lookup-order-id"
            value={orderIdInput}
            onChange={(event) => setOrderIdInput(event.target.value)}
            className="h-11 w-64 rounded-lg border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors focus-visible:border-foreground"
          />
        </div>
        <Button onClick={search}>Search</Button>
      </div>

      {filters !== null && (
        <div className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">Couldn&apos;t search redemptions.</p>}
          {!isLoading && redemptions.length === 0 && (
            <p className="text-sm text-muted-foreground">No matching redemptions.</p>
          )}

          {redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {redemption.couponCode}
                  </h3>
                  <Badge tone={STATUS_TONE[redemption.status]} showDot={false}>
                    {redemption.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {redemption.userEmail} · Order {redemption.orderId} · Rs.{" "}
                  {redemption.discountAmount.toLocaleString()} discount ·{" "}
                  {new Date(redemption.createdAt).toLocaleDateString()}
                </p>
                {redemption.status === "RELEASED" && redemption.releasedReason && (
                  <p className="mt-1 text-sm text-destructive">
                    Refusal reason: {redemption.releasedReason}
                  </p>
                )}
              </div>
            </div>
          ))}

          {hasNextPage && (
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mx-auto"
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
