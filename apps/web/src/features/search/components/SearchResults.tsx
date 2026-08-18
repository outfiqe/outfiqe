"use client";

import { useSearchParams } from "next/navigation";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

import { MIN_QUERY_LENGTH } from "../search.constants";

export const SearchResults = () => {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();
  const hasQuery = query.length >= MIN_QUERY_LENGTH;

  const {
    data: productsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts({ q: query, enabled: hasQuery });

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (!hasQuery) {
    return (
      <p className="mt-12 text-sm text-muted-foreground">
        Search for a product, brand, or category.
      </p>
    );
  }

  const products = productsPages?.pages.flatMap((page) => page.products) ?? [];
  const firstPage = productsPages?.pages[0];

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
        {query}
      </h1>
      {firstPage && (
        <p className="mt-2 text-sm text-muted-foreground">
          {firstPage.total} pieces from {firstPage.brandCount} brands
        </p>
      )}

      {isLoading ? (
        <ProductGridSkeleton className="mt-8" />
      ) : products.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">
          No pieces matched. Try a different search.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={toExploreProduct(product)} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div ref={sentinelRef} className="mt-10 flex justify-center">
          <span className="text-xs text-muted-foreground">
            {isFetchingNextPage ? "Loading more…" : ""}
          </span>
        </div>
      )}
    </div>
  );
};
