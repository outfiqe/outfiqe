"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";

import { useCart } from "../hooks/useCart";
import { CartItemRow } from "./CartItemRow";
import { CartSummary } from "./CartSummary";

const CartLoadingSkeleton = () => (
  <div className="space-y-4 py-6">
    {Array.from({ length: 3 }, (_, index) => (
      <Skeleton key={index} className="h-28 w-full rounded-xl" />
    ))}
  </div>
);

const EmptyBag = ({ message }: { message: string }) => (
  <div className="py-14 text-center">
    <p className="text-sm text-muted-foreground">{message}</p>
    <Button asChild className="mt-5">
      <Link href="/">Start shopping</Link>
    </Button>
  </div>
);

export const CartBody = () => {
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
            onClick={() => router.push("/login?redirect=/cart")}
            className="font-semibold text-primary-strong"
          >
            Sign in
          </button>{" "}
          to see your bag. It stays with your account across every device.
        </p>
      </div>
    );
  }

  if (cartQuery.isLoading) return <CartLoadingSkeleton />;

  const cart = cartQuery.data;
  if (!cart || cart.items.length === 0) {
    return <EmptyBag message="Your bag is empty. Have a look at what's trending this week." />;
  }

  const availableItems = cart.items.filter((item) => !item.soldOut);
  if (availableItems.length === 0) {
    return (
      <EmptyBag message="Everything in your bag sold out while it was sitting here. Have a look at what's trending this week." />
    );
  }

  return (
    <div className="grid gap-8 py-6 lg:grid-cols-[1fr_320px]">
      <div>
        {cart.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CartSummary cart={cart} />
      </div>
    </div>
  );
};
