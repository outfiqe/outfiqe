import { Skeleton } from "@outfiqe/design-system";

const GRID_ITEM_COUNT = 9;

export const CreatorPostGridSkeleton = () => (
  <div role="status" aria-label="Loading posts" className="grid grid-cols-2 gap-4 sm:grid-cols-3">
    {Array.from({ length: GRID_ITEM_COUNT }).map((_, index) => (
      <Skeleton key={index} className="aspect-[4/5] rounded-2xl" />
    ))}
  </div>
);
