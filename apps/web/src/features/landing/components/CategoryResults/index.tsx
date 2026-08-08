"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import { TASTE_CATEGORIES } from "../TasteCategories/tasteCategories.constants";
import { ProductCard } from "../ProductCard";
import { CategoryFilters } from "./CategoryFilters";
import { EXPLORE_PRODUCTS } from "./categoryResults.constants";

const GRID_SIZE = 10; // 2 rows x 5 columns

export function CategoryResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categorySlug = searchParams.get("category");
  const activeType = searchParams.get("type") ?? "all";

  // TASTE_CATEGORIES is a fixed, non-empty list, so the fallback always exists.
  const category = TASTE_CATEGORIES.find((c) => c.slug === categorySlug) ?? TASTE_CATEGORIES[0]!;

  const categoryProducts = EXPLORE_PRODUCTS.filter(
    (product) => product.categorySlug === category.slug,
  );
  const brandCount = new Set(categoryProducts.map((product) => product.brand)).size;

  const visibleProducts =
    activeType === "all"
      ? categoryProducts
      : categoryProducts.filter((product) => product.type === activeType);

  return (
    <section className="px-6 pb-10 pt-2 sm:pb-14 sm:pt-3 lg:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase text-foreground sm:text-4xl">
            In {category.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {categoryProducts.length} pieces from {brandCount} brands
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

      {visibleProducts.length === 0 ? (
        <p className="mt-12 text-sm text-muted-foreground">No pieces in this filter yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {visibleProducts.slice(0, GRID_SIZE).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
