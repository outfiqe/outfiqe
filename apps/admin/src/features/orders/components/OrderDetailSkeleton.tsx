import { Skeleton } from "@outfiqe/design-system";
import { ArrowLeft } from "lucide-react";

import { SkeletonBadge, SkeletonButton } from "@/components/SkeletonControls";

const ORDER_ITEM_SKELETON_COUNT = 2;
const ORDER_TOTALS_SKELETON_COUNT = 4;
const ORDER_BUYER_SKELETON_COUNT = 3;
const ORDER_CARD_CLASS = "rounded-xl border border-border bg-card p-4";

export const OrderDetailSkeleton = () => (
  <div role="status" aria-label="Loading">
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <ArrowLeft className="size-4" />
      Orders
    </span>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="mt-1 h-5 w-48" />
      </div>
      <div className="flex gap-1.5">
        <SkeletonBadge />
        <SkeletonBadge />
      </div>
    </div>

    <div className="mt-6 flex flex-wrap gap-2">
      <SkeletonButton variant="default" label="Mark as packed" />
      <SkeletonButton label="Cancel order" />
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <div className={ORDER_CARD_CLASS}>
        <h2 className="font-display text-sm font-bold text-foreground">Buyer</h2>
        <div className="mt-2 space-y-1">
          {Array.from({ length: ORDER_BUYER_SKELETON_COUNT }, (_unused, lineIndex) => (
            <Skeleton key={lineIndex} className="h-5 w-56 max-w-full" />
          ))}
        </div>
      </div>
      <div className={ORDER_CARD_CLASS}>
        <h2 className="font-display text-sm font-bold text-foreground">Totals</h2>
        <div className="mt-2 space-y-1">
          {Array.from({ length: ORDER_TOTALS_SKELETON_COUNT }, (_unused, rowIndex) => (
            <div key={rowIndex} className="flex justify-between gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className={`mt-4 ${ORDER_CARD_CLASS}`}>
      <h2 className="font-display text-sm font-bold text-foreground">Items</h2>
      <div className="mt-2 space-y-2">
        {Array.from({ length: ORDER_ITEM_SKELETON_COUNT }, (_unused, itemIndex) => (
          <Skeleton key={itemIndex} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);
