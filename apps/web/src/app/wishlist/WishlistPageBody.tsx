"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import { WishlistGrid } from "@/features/wishlist";

export const WishlistPageBody = () => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="py-10">
        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/wishlist")}
            className="font-semibold text-primary-strong"
          >
            Sign in
          </button>{" "}
          to see your saved pieces. They live with your account, so they&apos;re there on any
          device.
        </p>
      </div>
    );
  }

  return <WishlistGrid />;
};
