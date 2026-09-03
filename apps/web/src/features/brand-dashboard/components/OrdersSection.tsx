"use client";

import { Button, Skeleton } from "@outfiqe/design-system";

import { useBrandOrders } from "../hooks/useBrandOrders";
import { BrandOrderRow } from "./BrandOrderRow";

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
          {items.map((item) => (
            <BrandOrderRow key={item.id} item={item} />
          ))}
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
