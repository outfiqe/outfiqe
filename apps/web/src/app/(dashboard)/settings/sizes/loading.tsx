import { Skeleton } from "@outfiqe/design-system";

const SIZE_ROW_SKELETON_COUNT = 3;

const MySizesLoading = () => {
  return (
    <div role="status" aria-label="Loading" className="max-w-xl">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: SIZE_ROW_SKELETON_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default MySizesLoading;
