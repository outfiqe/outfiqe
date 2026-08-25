import { Skeleton } from "@outfiqe/design-system";

const ProgressLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="mt-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
};

export default ProgressLoading;
