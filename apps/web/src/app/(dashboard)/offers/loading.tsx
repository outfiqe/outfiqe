import { Skeleton } from "@outfiqe/design-system";

const OFFER_ROW_SKELETON_COUNT = 4;

const OffersLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: OFFER_ROW_SKELETON_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default OffersLoading;
