"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { getAvatarColor } from "@/shared/lib/avatarColor";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { Button, Badge } from "@outfiqe/design-system";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useInfiniteBrandProducts } from "../hooks/useInfiniteBrandProducts";
import type { BrandProfile as BrandProfileType } from "../api/brandProfileSchemas";

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

type BrandProfileProps = {
  brand: BrandProfileType;
};

export const BrandProfile = ({ brand }: BrandProfileProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const followMutation = useToggleFollow("brand");
  const products = useInfiniteBrandProducts(brand.id);

  const [isFollowing, setIsFollowing] = useState(brand.isFollowing);
  const [followerCount, setFollowerCount] = useState(brand.followerCount);

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/brand/${brand.id}`);
      return;
    }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => count + (wasFollowing ? -1 : 1));
    followMutation.mutate(
      { targetId: brand.id, following: wasFollowing },
      {
        onError: () => {
          setIsFollowing(wasFollowing);
          setFollowerCount((count) => count + (wasFollowing ? 1 : -1));
        },
      },
    );
  };

  const items = products.data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-5 pb-8">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
          style={{ backgroundColor: getAvatarColor(brand.id) }}
        >
          {brand.name.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {brand.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {toTitleCase(brand.category)} · Kathmandu
          </p>
          {brand.madeInNepal && <Badge className="mt-2">Made in Nepal</Badge>}

          <div className="mt-4 flex gap-6">
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">
                {brand.productCount}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Products</p>
            </div>
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">
                {followerCount.toLocaleString()}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Followers</p>
            </div>
            {brand.rating !== null && (
              <div>
                <p className="font-display text-lg font-extrabold text-foreground">
                  {brand.rating.toFixed(1)}
                </p>
                <p className="text-[11.5px] text-muted-foreground">Rating</p>
              </div>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          aria-pressed={isFollowing}
          onClick={toggleFollow}
          className="shrink-0"
        >
          {isFollowing ? "Following" : "Follow brand"}
        </Button>
      </div>

      {products.isLoading ? (
        <ProductGridSkeleton className="gap-x-4 gap-y-8" />
      ) : items.length === 0 ? (
        <p className="py-10 text-sm text-muted-foreground">No products listed yet.</p>
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
  );
};
