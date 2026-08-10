"use client";

import { useState } from "react";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteWishlist } from "../hooks/useInfiniteWishlist";

export function WishlistGrid() {
  const wishlist = useInfiniteWishlist();
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const products = (wishlist.data?.pages.flatMap((page) => page.products) ?? []).filter(
    (product) => !removedIds.has(product.id),
  );

  if (wishlist.isLoading) {
    return <ProductGridSkeleton className="gap-x-4 gap-y-8 pb-16" />;
  }

  if (products.length === 0) {
    return (
      <p className="py-10 text-sm text-muted-foreground">
        Nothing saved yet — tap the heart on a product to keep it here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 pb-16 sm:grid-cols-3 lg:grid-cols-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={{ ...toExploreProduct(product), isSaved: true }}
          onToggleSaved={(productId, saved) => {
            if (!saved) setRemovedIds((prev) => new Set(prev).add(productId));
          }}
        />
      ))}
      {wishlist.hasNextPage && (
        <button
          type="button"
          onClick={() => void wishlist.fetchNextPage()}
          disabled={wishlist.isFetchingNextPage}
          className="col-span-full mx-auto rounded-full border border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {wishlist.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
