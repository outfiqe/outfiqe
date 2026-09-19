import { Skeleton } from "@outfiqe/design-system";

import { SkeletonButton } from "./SkeletonControls";

export const ImageUploadSkeleton = () => (
  <div className="flex items-center gap-3" aria-hidden>
    <Skeleton className="size-14 shrink-0 rounded-lg" />
    <SkeletonButton label="Change image" />
  </div>
);
