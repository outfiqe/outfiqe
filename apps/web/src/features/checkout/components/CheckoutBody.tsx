"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart";

import { CheckoutForm } from "./CheckoutForm";

export const CheckoutBody = () => {
  const router = useRouter();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const cartQuery = useCart();

  if (!isAuthResolved) return null;

  if (!isAuthenticated) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => router.push("/login?redirect=/checkout")}
            className="font-semibold text-primary-strong"
          >
            Sign in
          </button>{" "}
          to check out.
        </p>
      </div>
    );
  }

  if (cartQuery.isLoading) {
    return (
      <div className="grid gap-8 py-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const cart = cartQuery.data;
  const purchasableItems = cart?.items.filter((item) => !item.soldOut) ?? [];
  if (!cart || purchasableItems.length === 0) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-muted-foreground">Add something before checking out.</p>
        <Button asChild className="mt-5">
          <Link href="/">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <CheckoutForm cart={cart} />
    </div>
  );
};
