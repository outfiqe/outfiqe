"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteProducts } from "@/features/products/hooks/useInfiniteProducts";
import { ALL_TYPE_ID, CategoryTypeFilters } from "@/shared/components/CategoryTypeFilters";
import { useLoadMoreOnVisible } from "@/shared/hooks/useLoadMoreOnVisible";
import { usePendingSelection } from "@/shared/hooks/usePendingSelection";

import { useCategorySelection } from "../../lib/CategorySelectionContext";
import { ProductCard } from "../ProductCard";

export const CategoryResults = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const activeType = searchParams.get("type") ?? ALL_TYPE_ID;

  const { pendingCategorySlug } = useCategorySelection();
  const { pendingValue: pendingType, markPending: markTypePending } =
    usePendingSelection<string>(activeType);

  const categories = useCategories();
  const category = categories.data?.find((c) => c.slug === categorySlug) ?? categories.data?.[0];

  const isNavigatingCategory = pendingCategorySlug !== null;
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
    enabled: Boolean(category) && !isNavigatingCategory,
  });

  const sentinelRef = useLoadMoreOnVisible(
    () => fetchNextPage(),
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (categories.isLoading) {
    return <ProductGridSkeleton className="mt-8 px-6 lg:px-10" />;
  }

  if (!category) {
    return null;
  }

  const displayCategory = pendingCategorySlug
    ? (categories.data?.find((c) => c.slug === pendingCategorySlug) ?? category)
    : category;
  const { name, slug } = displayCategory;

  const selectType = (typeId: string) => {
    markTypePending(typeId);
    const params = new URLSearchParams({ category: slug });
    if (typeId !== ALL_TYPE_ID) params.set("type", typeId);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const showLoadingGrid = isLoading || isNavigatingCategory || isNavigatingType;
  const products = productsPages?.pages.flatMap((page) => page.products) ?? [];
  const firstPage = isNavigatingCategory ? undefined : productsPages?.pages[0];

  return (
    <section className="px-6 pb-10 pt-2 sm:pb-14 sm:pt-3 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase text-foreground sm:text-3xl">
            In {name}
          </h2>
          {firstPage ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {firstPage.total} pieces from {firstPage.brandCount} brands
            </p>
          ) : (
            <Skeleton className="mt-2 h-4 w-40" />
          )}
        </div>

        <Button
          variant="link"
          onClick={() => {
            const params = new URLSearchParams({ category: slug });
            if (effectiveActiveType !== ALL_TYPE_ID) params.set("type", effectiveActiveType);
            router.push(`/shop?${params.toString()}`);
          }}
          className="h-auto gap-1 p-0"
        >
          View all
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <div className="mt-6">
        <CategoryTypeFilters
          activeType={effectiveActiveType}
          isNavigating={isNavigatingType}
          onSelectType={selectType}
        />
      </div>

      {showLoadingGrid ? (
        <ProductGridSkeleton className="mt-8" />
      ) : products.length === 0 ? (
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
};
