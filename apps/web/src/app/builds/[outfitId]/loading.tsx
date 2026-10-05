import { Skeleton } from "@outfiqe/design-system";

const SLOT_CARD_SKELETON_COUNT = 6;

const BuildLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: SLOT_CARD_SKELETON_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default BuildLoading;
