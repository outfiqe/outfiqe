import { Skeleton } from "@outfiqe/design-system";

const SupportLoading = () => {
  return (
    <div role="status" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <div className="mt-6 space-y-2.5">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default SupportLoading;
