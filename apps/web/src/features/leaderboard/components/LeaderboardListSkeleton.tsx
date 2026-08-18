import { Skeleton } from "@outfiqe/design-system";

const SKELETON_ROW_COUNT = 6;

export const LeaderboardListSkeleton = () => {
  return (
    <div
      role="status"
      aria-label="Loading leaderboard"
      className="overflow-hidden rounded-2xl border border-border"
    >
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
  );
};
