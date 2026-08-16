"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useToggleFollow } from "@/shared/hooks/useToggleFollow";
import { getAvatarColor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import type { BrandSummary } from "../api/brandsSchemas";
import {
  BRAND_STAT_LABEL,
  BRANDS_LOGIN_REDIRECT_PATH,
  FOLLOW_BUTTON_LABEL,
  MADE_IN_NEPAL_LABEL,
} from "../brands.constants";

type BrandCardProps = {
  brand: BrandSummary;
};

export const BrandCard = ({ brand }: BrandCardProps) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const followMutation = useToggleFollow("brand");

  const { id, name, avatarUrl, bannerUrl, madeInNepal, productCount } = brand;
  const [isFollowing, setIsFollowing] = useState(brand.isFollowing);
  const [followerCount, setFollowerCount] = useState(brand.followerCount);

  const toggleFollow = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${BRANDS_LOGIN_REDIRECT_PATH}`);
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

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border transition-colors hover:border-foreground/30">
      <Link href={`/brand/${id}`} className="absolute inset-0 z-0">
        <span className="sr-only">{name}</span>
      </Link>

      <div
        className={cn(
          "h-20 w-full bg-cover bg-center",
          !bannerUrl && "bg-gradient-to-br from-primary/80 via-primary to-primary-strong",
        )}
        style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
      />

      <div className="px-4 pb-4">
        <div
          className="-mt-7 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center ring-4 ring-card"
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
        >
          {!avatarUrl && (
            <span
              aria-hidden
              className="flex size-full items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: getAvatarColor(id) }}
            >
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold uppercase tracking-tight text-foreground">
              {name}
            </p>
            {madeInNepal && (
              <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">
                {MADE_IN_NEPAL_LABEL}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={toggleFollow}
            aria-pressed={isFollowing}
            className={cn(
              "relative z-10 shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              isFollowing
                ? "border-foreground bg-foreground text-background"
                : "border-foreground text-foreground hover:bg-foreground hover:text-background",
            )}
          >
            {isFollowing ? FOLLOW_BUTTON_LABEL.FOLLOWING : FOLLOW_BUTTON_LABEL.FOLLOW}
          </button>
        </div>

        <div className="mt-3 flex gap-4 text-[11.5px] text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{productCount}</span>{" "}
            {productCount === 1
              ? BRAND_STAT_LABEL.PRODUCT_SINGULAR
              : BRAND_STAT_LABEL.PRODUCT_PLURAL}
          </span>
          <span>
            <span className="font-semibold text-foreground">{followerCount.toLocaleString()}</span>{" "}
            {followerCount === 1
              ? BRAND_STAT_LABEL.FOLLOWER_SINGULAR
              : BRAND_STAT_LABEL.FOLLOWER_PLURAL}
          </span>
        </div>
      </div>
    </article>
  );
};
