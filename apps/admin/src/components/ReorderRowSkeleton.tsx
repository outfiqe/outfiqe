import { Skeleton } from "@outfiqe/design-system";

import { ImageUploadSkeleton } from "./ImageUploadSkeleton";
import { SkeletonBadge, SkeletonButton } from "./SkeletonControls";

type ReorderRowSkeletonProps = {
  hasImage?: boolean;
  actionLabel?: string;
};

export const ReorderRowSkeleton = ({
  hasImage = false,
  actionLabel = "Publish",
}: ReorderRowSkeletonProps) => (
  <div
    className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
    aria-hidden
  >
    <Skeleton className="size-4 rounded-sm" />
    <div className="flex flex-col">
      <Skeleton className="size-7 rounded-lg" />
      <Skeleton className="mt-0 size-7 rounded-lg" />
    </div>
    {hasImage && <ImageUploadSkeleton />}
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-40" />
        <SkeletonBadge />
      </div>
      <Skeleton className="mt-1 h-5 w-72 max-w-full" />
    </div>
    <SkeletonButton label={actionLabel} />
  </div>
);
