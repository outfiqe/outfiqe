import { Skeleton } from "@outfiqe/design-system";

const KPI_CARD_COUNT = 6;
const RECENT_ROW_COUNT = 5;

const OverviewLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: KPI_CARD_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-72 w-full rounded-2xl" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: RECENT_ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

export default OverviewLoading;
