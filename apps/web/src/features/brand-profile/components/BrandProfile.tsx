"use client";

import { Badge, Button } from "@outfiqe/design-system";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FollowersModal } from "@/components/FollowersModal";
import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";
import { useAuth } from "@/features/auth/context/AuthContext";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { useChatPanel } from "@/features/messaging";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";
import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { getAvatarColor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import type { BrandProfile as BrandProfileType } from "../api/brandProfileSchemas";
import { useInfiniteBrandProducts } from "../hooks/useInfiniteBrandProducts";

const PRODUCT_GRID_CLASS = "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5";
const ALL_PRODUCT_TYPE = "all";

type BrandProfileProps = {
  brand: BrandProfileType;
};

export const BrandProfile = ({ brand }: BrandProfileProps) => {
  const router = useRouter();
  const { isAuthenticated, state } = useAuth();
  const followMutation = useToggleFollow("brand");
  const productTypes = useProductTypes();
  const { openConversationWith, isStartingConversation } = useChatPanel();

  const { id, bannerUrl, avatarUrl, name, madeInNepal, productCount, rating, contactUserId } =
    brand;
  const isOwnBrand = state.user?.brandId === id;

  const [isFollowing, setIsFollowing] = useState(brand.isFollowing);
  const [followerCount, setFollowerCount] = useState(brand.followerCount);
  const [activeType, setActiveType] = useState(ALL_PRODUCT_TYPE);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);

  const products = useInfiniteBrandProducts(
    id,
    activeType === ALL_PRODUCT_TYPE ? undefined : activeType,
  );

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/brand/${id}`);
      return;
    }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount((count) => count + (wasFollowing ? -1 : 1));
    followMutation.mutate(
      { targetId: id, following: wasFollowing },
      {
        onError: () => {
          setIsFollowing(wasFollowing);
          setFollowerCount((count) => count + (wasFollowing ? 1 : -1));
        },
      },
    );
  };

  const messageBrand = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/brand/${id}`);
      return;
    }
    if (!contactUserId) return;
    openConversationWith(contactUserId);
  };

  const {
    data,
    isLoading: isProductsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = products;

  const brandProducts = useMemo(() => data?.pages.flatMap((page) => page.products) ?? [], [data]);

  const groupedByType = useMemo(() => {
    const groups = new Map<string, typeof brandProducts>();
    for (const product of brandProducts) {
      const group = groups.get(product.type) ?? [];
      group.push(product);
      groups.set(product.type, group);
    }
    return groups;
  }, [brandProducts]);

  const filters = [{ slug: ALL_PRODUCT_TYPE, label: "All" }, ...(productTypes.data ?? [])];
  const isLoading = isProductsLoading || productTypes.isLoading;
  const sectionedTypes = (productTypes.data ?? []).filter((type) => groupedByType.has(type.slug));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <div
          className={cn(
            "h-36 w-full bg-cover bg-center sm:h-52",
            !bannerUrl && "bg-gradient-to-br from-primary/80 via-primary to-primary-strong",
          )}
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        />

        <div className="flex flex-col items-center px-6 pb-8 text-center">
          <div
            className="-mt-12 flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center ring-4 ring-card sm:-mt-14 sm:size-28"
            style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
          >
            {!avatarUrl && (
              <span
                aria-hidden
                className="flex size-full items-center justify-center text-2xl font-bold text-white"
                style={{ backgroundColor: getAvatarColor(id) }}
              >
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-2xl font-extrabold uppercase tracking-tight text-foreground sm:text-3xl">
            {name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Kathmandu</p>
          {madeInNepal && <Badge className="mt-2">Made in Nepal</Badge>}

          <div className="mt-5 flex gap-8">
            <div>
              <p className="font-display text-lg font-extrabold text-foreground">{productCount}</p>
              <p className="text-[11.5px] text-muted-foreground">Products</p>
            </div>
            <button
              type="button"
              onClick={() => setFollowersModalOpen(true)}
              disabled={followerCount === 0}
              className="cursor-pointer disabled:cursor-not-allowed"
            >
              <p className="font-display text-lg font-extrabold text-foreground">
                {followerCount.toLocaleString()}
              </p>
              <p className="text-[11.5px] text-muted-foreground">Followers</p>
            </button>
            {rating !== null && (
              <div>
                <p className="font-display text-lg font-extrabold text-foreground">
                  {rating.toFixed(1)}
                </p>
                <p className="text-[11.5px] text-muted-foreground">Rating</p>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <Button variant="outline" aria-pressed={isFollowing} onClick={toggleFollow}>
              {isFollowing ? "Following" : "Follow brand"}
            </Button>
            {!isOwnBrand && contactUserId && (
              <Button variant="outline" onClick={messageBrand} disabled={isStartingConversation}>
                Message
              </Button>
            )}
          </div>
        </div>
      </div>

      {filters.length > 1 && (
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {filters.map(({ slug, label }) => {
            const isActive = slug === activeType;
            return (
              <button
                key={slug}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveType(slug)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <ProductGridSkeleton className="mt-8 gap-x-4 gap-y-8" />
      ) : brandProducts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No products listed yet.</p>
      ) : activeType === ALL_PRODUCT_TYPE ? (
        <div className="mt-8 space-y-10">
          {sectionedTypes.map(({ slug, label }) => (
            <section key={slug}>
              <h2 className="font-display text-lg font-bold text-foreground">{label}</h2>
              <div className={cn(PRODUCT_GRID_CLASS, "mt-4")}>
                {groupedByType.get(slug)?.map((product) => (
                  <ProductCard key={product.id} product={toExploreProduct(product)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={cn(PRODUCT_GRID_CLASS, "mt-8")}>
          {brandProducts.map((product) => (
            <ProductCard key={product.id} product={toExploreProduct(product)} />
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full border border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {followersModalOpen && (
        <FollowersModal
          targetType="brand"
          targetId={id}
          onClose={() => setFollowersModalOpen(false)}
        />
      )}
    </div>
  );
};
