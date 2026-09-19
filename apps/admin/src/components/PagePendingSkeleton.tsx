import { Skeleton } from "@outfiqe/design-system";

const SKELETON_CARD_COUNT = 3;
const SHIMMER_CLASS = "skeleton-shimmer animate-none";

export const PagePendingSkeleton = () => (
  <div role="status" className="flex flex-col gap-6">
    <div className="flex flex-col gap-2">
      <Skeleton className={`${SHIMMER_CLASS} h-8 w-56`} />
      <Skeleton className={`${SHIMMER_CLASS} h-4 w-80 max-w-full`} />
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_unused, cardIndex) => (
        <Skeleton key={cardIndex} className={`${SHIMMER_CLASS} h-24 rounded-xl`} />
      ))}
    </div>
    <Skeleton className={`${SHIMMER_CLASS} h-64 rounded-xl`} />
    <span className="sr-only">Loading page</span>
  </div>
);
