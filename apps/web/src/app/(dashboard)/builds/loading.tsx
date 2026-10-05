import { Skeleton } from "@outfiqe/design-system";

const BUILD_CARD_SKELETON_COUNT = 8;

const MyBuildsLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: BUILD_CARD_SKELETON_COUNT }).map((_, index) => (
          <Skeleton key={index} className="aspect-[3/4] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default MyBuildsLoading;
