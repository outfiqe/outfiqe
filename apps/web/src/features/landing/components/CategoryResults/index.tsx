"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { TASTE_CATEGORIES } from "../TasteCategories/tasteCategories.constants";
import { ProductCard } from "../ProductCard";
import { CategoryFilters } from "./CategoryFilters";

export function CategoryResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const activeType = searchParams.get("type") ?? "all";

  const category = TASTE_CATEGORIES.find((c) => c.slug === categorySlug) ?? TASTE_CATEGORIES[0]!;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteProducts(
    category.slug,
    activeType === "all" ? undefined : activeType,
  );

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  const products = data?.pages.flatMap((page) => page.products) ?? [];
  const firstPage = data?.pages[0];

  return (
    <section className="px-6 pb-10 pt-2 sm:pb-14 sm:pt-3 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase text-foreground sm:text-4xl">
            In {category.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {firstPage
              ? `${firstPage.total} pieces from ${firstPage.brandCount} brands`
              : "Loading…"}
          </p>
        </div>

        <Button
          variant="link"
          onClick={() => router.replace(`/?category=${category.slug}`, { scroll: false })}
          className="h-auto gap-1 p-0"
        >
          View all
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-6">
        <CategoryFilters categorySlug={category.slug} activeType={activeType} />
      </div>

      {!isLoading && products.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">No pieces in this filter yet.</p>
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
    </section>
  );
}
