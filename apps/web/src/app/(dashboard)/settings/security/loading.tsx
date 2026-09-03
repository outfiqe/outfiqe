import { Skeleton } from "@outfiqe/design-system";

const CONNECTED_ACCOUNT_ROW_COUNT = 2;

const SecurityLoading = () => (
  <div role="status" aria-label="Loading" className="max-w-xl">
    <div className="space-y-2">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-3.5 w-72" />
    </div>

    <div className="mt-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-3 w-full max-w-md" />
      <Skeleton className="mt-3 h-28 w-full rounded-2xl" />
    </div>

    <div className="mt-6">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-2 h-3 w-full max-w-xs" />
      <div className="mt-3 space-y-3">
        {Array.from({ length: CONNECTED_ACCOUNT_ROW_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

export default SecurityLoading;
