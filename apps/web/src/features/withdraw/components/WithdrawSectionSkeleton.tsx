import { Skeleton } from "@outfiqe/design-system";

const BANK_ACCOUNT_ROW_COUNT = 2;
const HISTORY_ROW_COUNT = 3;

export const WithdrawSectionSkeleton = () => (
  <div>
    <div className="space-y-2">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3.5 w-72" />
    </div>

    <Skeleton className="mt-6 h-24 w-full rounded-2xl" />

    <div className="mt-6 space-y-3">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: BANK_ACCOUNT_ROW_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>

    <div className="mt-6 rounded-2xl border border-border p-5">
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>

    <div className="mt-6 space-y-3">
      <Skeleton className="h-4 w-20" />
      {Array.from({ length: HISTORY_ROW_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  </div>
);
