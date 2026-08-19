import { Skeleton } from "@outfiqe/design-system";

const PODIUM_SKELETON_COUNT = 3;
const SKELETON_ROW_COUNT = 4;

export const LeaderboardListSkeleton = () => {
  return (
    <div role="status" aria-label="Loading leaderboard" className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: PODIUM_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-border">
            <Skeleton className="h-20 rounded-none" />
            <div className="flex flex-col items-center gap-2 px-5 pb-5">
              <Skeleton className="-mt-8 size-16 shrink-0 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="mt-2 h-8 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-b-0"
          >
            <Skeleton className="h-5 w-6 shrink-0" />
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
