import { Skeleton, StatCardSkeleton } from "@outfiqe/design-system";

const MONEY_CARD_COUNT = 6;
const SECTION_HEIGHT_CLASS_NAMES = ["h-72", "h-72"];

export const RollupSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading the rollup">
    <Skeleton className="h-12 w-full rounded-lg" />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: MONEY_CARD_COUNT }, (_unused, index) => (
        <StatCardSkeleton key={index} />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {SECTION_HEIGHT_CLASS_NAMES.map((heightClassName, index) => (
        <Skeleton key={index} className={`${heightClassName} w-full rounded-xl`} />
      ))}
    </div>
  </div>
);
