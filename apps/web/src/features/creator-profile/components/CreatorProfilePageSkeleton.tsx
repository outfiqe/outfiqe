import { Skeleton } from "@outfiqe/design-system";

import { CreatorPostGridSkeleton } from "./CreatorPostGridSkeleton";

export const CreatorProfilePageSkeleton = () => (
  <div role="status" aria-label="Loading profile">
    <div className="flex flex-wrap items-center gap-5 pb-8">
      <Skeleton className="size-20 shrink-0 rounded-full" />

      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-6 pt-2">
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-9 w-12" />
          <Skeleton className="h-9 w-12" />
        </div>
      </div>

      <Skeleton className="h-10 w-24 shrink-0 rounded-full" />
    </div>

    <CreatorPostGridSkeleton />
  </div>
);
