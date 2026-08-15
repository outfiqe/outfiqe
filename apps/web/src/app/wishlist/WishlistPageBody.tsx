"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import { SavedPostsGrid } from "@/features/explore";
import {
  SAVED_QUERY_PARAM,
  SAVED_TAB,
  SAVED_TABS,
  type SavedTabValue,
  WishlistGrid,
} from "@/features/wishlist";
import { cn } from "@/shared/lib/cn";

const buildSavedUrl = (tab: SavedTabValue): string => `/wishlist?${SAVED_QUERY_PARAM.TAB}=${tab}`;

export const WishlistPageBody = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isAuthResolved } = useAuth();

  const tab =
    searchParams.get(SAVED_QUERY_PARAM.TAB) === SAVED_TAB.POSTS
      ? SAVED_TAB.POSTS
      : SAVED_TAB.PRODUCTS;
  const selectTab = (value: SavedTabValue) =>
    router.replace(buildSavedUrl(value), { scroll: false });

  if (!isAuthResolved) return null;

  if (!isAuthenticated) {
    return (
      <div className="py-10">
        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push(`/login?redirect=${encodeURIComponent(buildSavedUrl(tab))}`)}
            className="font-semibold text-primary-strong"
          >
            Sign in
          </button>{" "}
          to see everything you&apos;ve saved. It lives with your account, so it&apos;s there on any
          device.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mt-6 flex gap-2 border-b border-border">
        {SAVED_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => selectTab(value)}
            aria-pressed={tab === value}
            className={cn(
              "-mb-px border-b-2 px-1 pb-2.5 text-sm font-semibold transition-colors",
              tab === value
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pt-6">
        {tab === SAVED_TAB.PRODUCTS ? <WishlistGrid /> : <SavedPostsGrid />}
      </div>
    </div>
  );
};
