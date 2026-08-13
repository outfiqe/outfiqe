"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/shared/lib/cn";
import { getAvatarColor } from "@/shared/lib/avatarColor";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { Button, Badge } from "@outfiqe/design-system";
import { toTitleCase } from "@outfiqe/utils";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useInfiniteBrandProducts } from "../hooks/useInfiniteBrandProducts";
import type { BrandProfile as BrandProfileType } from "../api/brandProfileSchemas";

const PRODUCT_GRID_CLASS = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5";
const ALL_PRODUCT_TYPE = "all";

type BrandProfileProps = {
  brand: BrandProfileType;
};

export const BrandProfile = ({ brand }: BrandProfileProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const followMutation = useToggleFollow("brand");
  const productTypes = useProductTypes();

  const [isFollowing, setIsFollowing] = useState(brand.isFollowing);
  const [followerCount, setFollowerCount] = useState(brand.followerCount);
  const [activeType, setActiveType] = useState(ALL_PRODUCT_TYPE);

  const products = useInfiniteBrandProducts(
    brand.id,
    activeType === ALL_PRODUCT_TYPE ? undefined : activeType,
  );

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

  const categoryLabel = brand.categories.map(toTitleCase).join(" · ");

  const items = useMemo(
    () => products.data?.pages.flatMap((page) => page.products) ?? [],
    [products.data],
  );

  const groupedByType = useMemo(() => {
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const group = groups.get(item.type) ?? [];
      group.push(item);
      groups.set(item.type, group);
    }
    return groups;
  }, [items]);

  const filters = [{ slug: ALL_PRODUCT_TYPE, label: "All" }, ...(productTypes.data ?? [])];
  const isLoading = products.isLoading || productTypes.isLoading;
  const sectionedTypes = (productTypes.data ?? []).filter((type) => groupedByType.has(type.slug));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div
          className={cn(
            "h-36 w-full bg-cover bg-center sm:h-52",
            !brand.bannerUrl && "bg-gradient-to-br from-primary/80 via-primary to-primary-strong",
          )}
          style={brand.bannerUrl ? { backgroundImage: `url(${brand.bannerUrl})` } : undefined}
        />

        <div className="flex flex-col items-center px-6 pb-8 text-center">
          <div
            className="-mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center ring-4 ring-card sm:-mt-14 sm:size-28"
            style={brand.avatarUrl ? { backgroundImage: `url(${brand.avatarUrl})` } : undefined}
          >
            {!brand.avatarUrl && (
              <span
                aria-hidden
                className="flex size-full items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: getAvatarColor(brand.id) }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {brand.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{categoryLabel} · Kathmandu</p>
          {brand.madeInNepal && <Badge className="mt-2">Made in Nepal</Badge>}

          <div className="mt-5 flex gap-8">
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

          <Button
            variant="outline"
            aria-pressed={isFollowing}
            onClick={toggleFollow}
            className="mt-5"
          >
            {isFollowing ? "Following" : "Follow brand"}
          </Button>
        </div>
      </div>

      {filters.length > 1 && (
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {filters.map((filter) => {
            const isActive = filter.slug === activeType;
            return (
              <button
                key={filter.slug}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveType(filter.slug)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <ProductGridSkeleton className="mt-8 gap-x-4 gap-y-8" />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No products listed yet.</p>
      ) : activeType === ALL_PRODUCT_TYPE ? (
        <div className="mt-8 space-y-10">
          {sectionedTypes.map((type) => (
            <section key={type.slug}>
              <h2 className="font-display text-lg font-bold text-foreground">{type.label}</h2>
              <div className={cn(PRODUCT_GRID_CLASS, "mt-4")}>
                {groupedByType.get(type.slug)?.map((product) => (
                  <ProductCard key={product.id} product={toExploreProduct(product)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={cn(PRODUCT_GRID_CLASS, "mt-8")}>
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
