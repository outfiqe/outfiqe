import { Skeleton } from "@outfiqe/design-system";

const SKELETON_CARD_COUNT = 3;

export const PagePendingSkeleton = () => (
  <div role="status" className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_unused, cardIndex) => (
        <Skeleton key={cardIndex} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-64 rounded-xl" />
    <span className="sr-only">Loading page</span>
  </div>
);
