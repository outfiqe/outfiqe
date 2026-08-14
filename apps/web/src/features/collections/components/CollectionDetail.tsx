"use client";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { getAvatarColor } from "@/shared/lib/avatarColor";

import type { PublicCollection } from "../api/collectionSchemas";
import { useInfiniteCollectionProducts } from "../hooks/useInfiniteCollectionProducts";

type CollectionDetailProps = {
  collection: PublicCollection;
};

export const CollectionDetail = ({ collection }: CollectionDetailProps) => {
  const products = useInfiniteCollectionProducts(collection.slug);
  const items = products.data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div
        className="relative flex min-h-40 items-end overflow-hidden rounded-2xl bg-cover bg-center p-6 sm:p-10"
        style={{
          backgroundColor: collection.imageUrl ? undefined : getAvatarColor(collection.id),
          backgroundImage: collection.imageUrl ? `url(${collection.imageUrl})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="relative z-10">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-2 max-w-lg text-sm text-white/85">{collection.description}</p>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/70">
            {collection.productCount} {collection.productCount === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {products.isLoading ? (
          <ProductGridSkeleton />
        ) : items.length === 0 ? (
          <p className="py-10 text-sm text-muted-foreground">No products in this collection yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {items.map((product) => (
              <ProductCard key={product.id} product={toExploreProduct(product)} />
            ))}
          </div>
        )}

        {products.hasNextPage && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => void products.fetchNextPage()}
              disabled={products.isFetchingNextPage}
              className="rounded-full border border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {products.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
