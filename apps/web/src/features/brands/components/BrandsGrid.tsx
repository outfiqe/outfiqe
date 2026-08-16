"use client";

import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { BRAND_GRID_CLASS } from "../brands.constants";
import { useInfiniteBrands } from "../hooks/useInfiniteBrands";
import { BrandCard } from "./BrandCard";
import { BrandGridSkeleton } from "./BrandGridSkeleton";

export const BrandsGrid = () => {
  const {
    data: brandPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteBrands();

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const brands = brandPages?.pages.flatMap((page) => page.brands) ?? [];

  if (isLoading) return <BrandGridSkeleton />;

  if (isError) {
    return <p className="py-12 text-sm text-muted-foreground">Couldn&apos;t load brands.</p>;
  }

  if (brands.length === 0) {
    return <p className="py-12 text-sm text-muted-foreground">No brands yet.</p>;
  }

  return (
    <>
      <div className={BRAND_GRID_CLASS}>
        {brands.map((brand) => (
          <BrandCard key={brand.id} brand={brand} />
        ))}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} className="mt-10 flex justify-center">
          <span className="text-xs text-muted-foreground">
            {isFetchingNextPage ? "Loading more…" : ""}
          </span>
        </div>
      )}
    </>
  );
};
