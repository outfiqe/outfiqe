import { Skeleton } from "@outfiqe/design-system";

import { FEED_LAYOUT, type FeedLayout } from "../explore.constants";

export const PostCardSkeleton = () => {
  return (
    <div className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
      </div>

      <Skeleton className="aspect-4/5 w-full rounded-none" />

      <div className="space-y-2 px-3 py-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
};

export const ExploreFeedSkeleton = ({ layout = FEED_LAYOUT.GRID }: { layout?: FeedLayout }) => {
  if (layout === FEED_LAYOUT.LIST) {
    return (
      <div role="status" aria-label="Loading feed" className="mx-auto flex max-w-xl flex-col">
        {Array.from({ length: 4 }).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading feed"
      className="columns-1 gap-4 sm:columns-2 xl:columns-3"
    >
      {Array.from({ length: 9 }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  );
};
