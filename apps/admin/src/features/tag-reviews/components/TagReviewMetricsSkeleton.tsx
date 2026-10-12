import { Skeleton, StatCardSkeleton } from "@outfiqe/design-system";

const OVERVIEW_TILE_COUNT = 4;
const DETAIL_CARD_ROW_COUNTS = [2, 2, 3];

export const TagReviewMetricsSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading">
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground">Tag reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        How the Brand Tag Review funnel is running across every brand. All-time unless noted.
      </p>
    </div>
    <Skeleton className="h-14 w-full rounded-lg" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: OVERVIEW_TILE_COUNT }, (_unused, index) => (
        <StatCardSkeleton key={index} hasDelta />
      ))}
    </div>
    <Skeleton className="h-40 w-full rounded-2xl" />
    <div className="grid gap-4 md:grid-cols-2">
      {DETAIL_CARD_ROW_COUNTS.map((rowCount, cardIndex) => (
        <div key={cardIndex} className="rounded-xl border border-border bg-card p-5">
          {Array.from({ length: rowCount }, (_unused, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-between gap-3 py-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);
