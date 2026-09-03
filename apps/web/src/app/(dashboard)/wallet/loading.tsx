import { Skeleton } from "@outfiqe/design-system";

import { WithdrawSectionSkeleton } from "@/features/withdraw";

const SUMMARY_TILE_COUNT = 4;

const WalletLoading = () => (
  <div role="status" aria-label="Loading">
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: SUMMARY_TILE_COUNT }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-border bg-card p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-6 w-16" />
        </div>
      ))}
    </div>

    <WithdrawSectionSkeleton />
  </div>
);

export default WalletLoading;
