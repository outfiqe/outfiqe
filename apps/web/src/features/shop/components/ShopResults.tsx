"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { PRODUCT_SORT, PRODUCT_SORT_VALUES, type ProductSort } from "@outfiqe/utils";
import { useRouter, useSearchParams } from "next/navigation";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { ALL_TYPE_ID, CategoryTypeFilters } from "@/shared/components/CategoryTypeFilters";
import { TRENDING_RANKS } from "@/shared/components/TrendingRankBadge";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { usePendingSelection } from "@/shared/hooks/usePendingSelection";
import { formatResultCount } from "@/shared/lib/formatCount";

import { ThriftOnlyToggle } from "./ThriftOnlyToggle";

const SHOP_BASE_PATH = "/shop";

const parseSort = (value: string | null): ProductSort | undefined =>
  PRODUCT_SORT_VALUES.find((candidate) => candidate === value);

export const ShopResults = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthResolved } = useAuth();
  const categorySlug = searchParams.get("category");
  const activeType = searchParams.get("type") ?? ALL_TYPE_ID;
  const sort = parseSort(searchParams.get("sort"));
  const thriftOnly = searchParams.get("thrift") === "true";

  const { pendingValue: pendingType, markPending: markTypePending } =
    usePendingSelection<string>(activeType);

  const categories = useCategories();
  const category = categorySlug
    ? categories.data?.find((candidate) => candidate.slug === categorySlug)
    : undefined;
  const isResolvingCategory = Boolean(categorySlug) && categories.isLoading;

  const isNavigatingType = pendingType !== null;
  const effectiveActiveType = pendingType ?? activeType;

  const {
    data: productsPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts({
    category: category?.slug,
    type: effectiveActiveType === ALL_TYPE_ID ? undefined : effectiveActiveType,
    sort,
    thrift: thriftOnly ? true : undefined,
    enabled: isAuthResolved && !isResolvingCategory,
  });

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (isResolvingCategory || !isAuthResolved) {
    return <ProductGridSkeleton className="mt-8" />;
  }

  const selectType = (typeId: string) => {
    if (!category) return;
    markTypePending(typeId);
    const params = new URLSearchParams({ category: category.slug });
    if (typeId !== ALL_TYPE_ID) params.set("type", typeId);
    router.replace(`${SHOP_BASE_PATH}?${params.toString()}`, { scroll: false });
  };

  const toggleThriftOnly = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (thriftOnly) {
      params.delete("thrift");
    } else {
      params.set("thrift", "true");
    }
    router.replace(`${SHOP_BASE_PATH}?${params.toString()}`, { scroll: false });
  };

  const showLoadingGrid = isLoading || isNavigatingType;
  const products = productsPages?.pages.flatMap((page) => page.products) ?? [];
  const firstPage = productsPages?.pages[0];

  const showTrendingRanks = sort === PRODUCT_SORT.TRENDING;

  return (
    <div>
      {firstPage ? (
        <p className="min-h-5 text-sm text-muted-foreground">
          {formatResultCount(firstPage.total, firstPage.brandCount)}
        </p>
      ) : (
        <Skeleton className="h-4 w-40" />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {category && (
          <CategoryTypeFilters
            activeType={effectiveActiveType}
            isNavigating={isNavigatingType}
            onSelectType={selectType}
          />
        )}
        <ThriftOnlyToggle active={thriftOnly} onToggle={toggleThriftOnly} />
      </div>

      {showLoadingGrid ? (
        <ProductGridSkeleton className="mt-8" />
      ) : products.length === 0 ? (
        <div className="mt-12 flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            {thriftOnly ? "No thrift pieces here yet." : "No pieces here yet. Check back soon."}
          </p>
          {thriftOnly && (
            <Button variant="outline" size="sm" onClick={toggleThriftOnly}>
              Show all pieces
            </Button>
          )}
        </div>
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
