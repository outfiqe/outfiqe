"use client";

import { Skeleton } from "@outfiqe/design-system";
import { PRODUCT_SORT, PRODUCT_SORT_VALUES, type ProductSort } from "@outfiqe/utils";
import { useSearchParams } from "next/navigation";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { ALL_TYPE_ID, CategoryTypeFilters } from "@/shared/components/CategoryTypeFilters";
import { TRENDING_RANKS } from "@/shared/components/TrendingRankBadge";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";

const SHOP_BASE_PATH = "/shop";

const SORT_HEADING: Record<ProductSort, string> = {
  [PRODUCT_SORT.NEWEST]: "Shop everything",
  [PRODUCT_SORT.TRENDING]: "Trending now",
  [PRODUCT_SORT.NEW_ARRIVALS]: "New arrivals",
};

const parseSort = (value: string | null): ProductSort | undefined =>
  PRODUCT_SORT_VALUES.find((candidate) => candidate === value);

export const ShopResults = () => {
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const activeType = searchParams.get("type") ?? ALL_TYPE_ID;
  const sort = parseSort(searchParams.get("sort"));

  const categories = useCategories();
  const category = categorySlug
    ? categories.data?.find((candidate) => candidate.slug === categorySlug)
    : undefined;
  const isResolvingCategory = Boolean(categorySlug) && categories.isLoading;

  const {
    data: productsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts({
    category: category?.slug,
    type: activeType === ALL_TYPE_ID ? undefined : activeType,
    sort,
    enabled: !isResolvingCategory,
  });

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (isResolvingCategory) {
    return <ProductGridSkeleton className="mt-8" />;
  }

  const products = productsPages?.pages.flatMap((page) => page.products) ?? [];
  const firstPage = productsPages?.pages[0];

  const heading = category ? `In ${category.name}` : SORT_HEADING[sort ?? PRODUCT_SORT.NEWEST];
  const showTrendingRanks = sort === PRODUCT_SORT.TRENDING;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-foreground sm:text-4xl">
        {heading}
      </h1>
      {firstPage ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {firstPage.total} pieces from {firstPage.brandCount} brands
        </p>
      ) : (
        <Skeleton className="mt-2.5 h-4 w-40" />
      )}

      {category && (
        <div className="mt-6">
          <CategoryTypeFilters
            basePath={SHOP_BASE_PATH}
            categorySlug={category.slug}
            activeType={activeType}
          />
        </div>
      )}

      {isLoading ? (
        <ProductGridSkeleton className="mt-8" />
      ) : products.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={toExploreProduct(product)}
              trendingRank={showTrendingRanks ? TRENDING_RANKS[index] : undefined}
            />
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
