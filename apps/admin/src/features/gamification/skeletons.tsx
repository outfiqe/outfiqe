import { Skeleton } from "@outfiqe/design-system";

import { SkeletonButton } from "@/components/SkeletonControls";

const BADGE_CARD_ACTION_COUNT = 2;

export const TitleActionCardSkeleton = () => (
  <div className="rounded-xl border border-border bg-card p-4" aria-hidden>
    <div className="flex items-start justify-between gap-2">
      <Skeleton className="h-5 w-56" />
      <SkeletonButton size="sm" label="Edit" />
    </div>
    <Skeleton className="mt-1 h-4 w-72 max-w-full" />
  </div>
);

export const BadgeCardSkeleton = () => (
  <div className="flex flex-col rounded-xl border border-border bg-card p-4" aria-hidden>
    <div className="flex min-w-0 items-start gap-2.5">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/2" />
      </div>
    </div>
    <div className="mt-auto flex gap-1.5 pt-3">
      {Array.from({ length: BADGE_CARD_ACTION_COUNT }, (_unused, actionIndex) => (
        <SkeletonButton
          key={actionIndex}
          size="sm"
          className="flex-1"
          label={actionIndex === 0 ? "Duplicate" : "Edit"}
        />
      ))}
    </div>
  </div>
);

export const CategoryToggleRowSkeleton = () => (
  <div
    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    <Skeleton className="h-5 w-40" />
    <Skeleton className="size-4 rounded" />
  </div>
);
