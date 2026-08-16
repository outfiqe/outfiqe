"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { Shirt } from "lucide-react";

import type { BrandOrderItem } from "../api/brandOrdersSchemas";
import { useBrandOrders } from "../hooks/useBrandOrders";

const PAYMENT_STATUS_LABEL: Record<BrandOrderItem["paymentStatus"], string> = {
  INITIATED: "Payment pending",
  PAID: "Paid",
  DUE: "Cash on delivery",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
};

const PAYMENT_STATUS_CLASS: Record<BrandOrderItem["paymentStatus"], string> = {
  INITIATED: "bg-muted text-foreground",
  PAID: "bg-primary/10 text-primary-strong",
  DUE: "bg-muted text-foreground",
  FAILED: "bg-destructive/10 text-destructive",
  REFUNDED: "bg-destructive/10 text-destructive",
};

const FULFILMENT_STATUS_CLASS: Record<BrandOrderItem["fulfilmentStatus"], string> = {
  PLACED: "bg-muted text-foreground",
  PACKED: "bg-muted text-foreground",
  SHIPPED: "bg-muted text-foreground",
  DELIVERED: "bg-primary/10 text-primary-strong",
  CANCELLED: "bg-destructive/10 text-destructive",
};

export const OrdersSection = () => {
  const { data, isPending, hasNextPage, fetchNextPage, isFetchingNextPage } = useBrandOrders();
  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sales of your products, across all orders.
        </p>
      </div>

      {isPending && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && items.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No sales yet — they&apos;ll show up here once your products start selling.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6 space-y-3">
          {items.map((item) => {
            const {
              id,
              productName,
              imageUrl,
              sizeLabel,
              qty,
              unitPrice,
              orderId,
              orderCreatedAt,
              paymentStatus,
              fulfilmentStatus,
            } = item;

            return (
              <div
                key={id}
                className="flex items-center gap-4 rounded-2xl border border-border p-4"
              >
                <div
                  className="flex aspect-3/4 w-14 shrink-0 items-center justify-center rounded-lg bg-muted bg-cover bg-center"
                  style={{ backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
                >
                  {!imageUrl && <Shirt className="size-6 text-foreground/25" strokeWidth={1} />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{productName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sizeLabel} · Qty {qty} · Rs. {unitPrice.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Order {orderId} · {new Date(orderCreatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_STATUS_CLASS[paymentStatus]}`}
                  >
                    {PAYMENT_STATUS_LABEL[paymentStatus]}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${FULFILMENT_STATUS_CLASS[fulfilmentStatus]}`}
                  >
                    {fulfilmentStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
};
