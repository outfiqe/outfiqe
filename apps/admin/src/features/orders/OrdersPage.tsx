import { Badge, Button } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useInfiniteOrders } from "./hooks/useInfiniteOrders";
import { FULFILMENT_STATUS_TONE, PAYMENT_STATUS_TONE } from "./orderStatusTone";
import type { FulfilmentStatusValue } from "./schemas";

const TABS: (FulfilmentStatusValue | "ALL")[] = [
  "ALL",
  "PLACED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export const OrdersPage = () => {
  const [tab, setTab] = useState<FulfilmentStatusValue | "ALL">("ALL");

  const {
    data: ordersQuery,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteOrders(tab === "ALL" ? undefined : tab);
  const orders = ordersQuery?.pages.flatMap((page) => page.orders) ?? [];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((status) => (
          <button
            key={status}
            onClick={() => setTab(status)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === status
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {status[0]}
            {status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">Couldn&apos;t load orders.</p>}
        {!isLoading && orders.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here right now.</p>
        )}

        {orders.map((order) => {
          const {
            id,
            buyerName,
            paymentMethod,
            paymentStatus,
            fulfilmentStatus,
            total,
            itemCount,
            firstItemProductName,
            needsManualRefund,
          } = order;

          return (
            <Link
              key={id}
              to="/orders/$orderId"
              params={{ orderId: id }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-foreground">{buyerName}</h2>
                  {needsManualRefund && (
                    <Badge tone="negative" showDot={false}>
                      Needs manual refund
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {firstItemProductName}
                  {itemCount > 1 ? ` and ${itemCount - 1} more` : ""} · Rs. {total.toLocaleString()}{" "}
                  · {paymentMethod}
                </p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <Badge tone={PAYMENT_STATUS_TONE[paymentStatus]} showDot={false}>
                  {paymentStatus}
                </Badge>
                <Badge tone={FULFILMENT_STATUS_TONE[fulfilmentStatus]} showDot={false}>
                  {fulfilmentStatus}
                </Badge>
              </div>
            </Link>
          );
        })}

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
    </div>
  );
};
