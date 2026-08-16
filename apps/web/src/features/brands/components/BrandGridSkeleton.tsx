import { Skeleton } from "@outfiqe/design-system";

import { BRAND_GRID_CLASS, BRAND_GRID_SKELETON_COUNT } from "../brands.constants";

export const BrandGridSkeleton = () => {
  return (
    <div role="status" aria-label="Loading brands" className={BRAND_GRID_CLASS}>
      {Array.from({ length: BRAND_GRID_SKELETON_COUNT }).map((_, index) => (
        <Skeleton key={index} className="h-44 rounded-2xl" />
      ))}
    </div>
  );
};
