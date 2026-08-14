import { Skeleton } from "@outfiqe/design-system";

import type { FeedLayout } from "./FeedFilterTabs";

export function PostCardSkeleton() {
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
}

function PostListItemSkeleton() {
  return (
    <div className="flex gap-4 border-b border-border py-4 first:pt-0">
      <Skeleton className="size-28 shrink-0 rounded-xl sm:size-32" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function ExploreFeedSkeleton({ layout = "grid" }: { layout?: FeedLayout }) {
  if (layout === "list") {
    return (
      <div role="status" aria-label="Loading feed">
        {Array.from({ length: 6 }).map((_, index) => (
          <PostListItemSkeleton key={index} />
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
}
