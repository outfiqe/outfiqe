"use client";

import { Button, FormBanner, Skeleton } from "@outfiqe/design-system";

import { useBrandShipments } from "../hooks/useBrandShipments";
import { BrandShipmentRow } from "./BrandShipmentRow";

const SKELETON_ROW_COUNT = 4;

export const OrdersSection = () => {
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useBrandShipments();
  const shipments = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div>
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One shipment per order — pack, ship and track your items.
        </p>
      </div>

      {isError && (
        <div className="mt-6">
          <FormBanner>We couldn&apos;t load your orders right now. Please try again.</FormBanner>
        </div>
      )}

      {isPending && !isError && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isPending && !isError && shipments.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No sales yet — orders will show up here once your products start selling.
          </p>
        </div>
      )}

      {shipments.length > 0 && (
        <div className="mt-6 space-y-3">
          {shipments.map((shipment) => (
            <BrandShipmentRow key={shipment.id} shipment={shipment} />
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
