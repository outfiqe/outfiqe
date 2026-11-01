import { Skeleton } from "@outfiqe/design-system";

const SKELETON_ITEM_COUNT = 3;

export const BuildDetailSkeleton = () => (
  <div aria-busy className="space-y-4">
    <Skeleton className="aspect-[4/3] w-full rounded-xl" />
    <Skeleton className="h-4 w-1/2" />
    {Array.from({ length: SKELETON_ITEM_COUNT }, (_, index) => (
      <Skeleton key={index} className="h-20 w-full rounded-xl" />
    ))}
  </div>
);
