"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart";
import { resolveZonePreview, useDeliveryZones } from "@/features/delivery-zones";

import { useBuyNowPayload } from "../hooks/useBuyNowPayload";
import { buildBuyNowCart } from "../lib/buildBuyNowCart";
import { CheckoutForm } from "./CheckoutForm";

export const CheckoutBody = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get("buyNow") === "1";

  const { isAuthenticated, isAuthResolved } = useAuth();
  const cartQuery = useCart();
  const deliveryZonesQuery = useDeliveryZones();
  const buyNow = useBuyNowPayload(isBuyNow);

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

  const isLoading =
    deliveryZonesQuery.isLoading || (isBuyNow ? !buyNow.isResolved : cartQuery.isLoading);
  if (isLoading) {
    return (
      <div className="grid gap-8 py-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const resolvedZone = deliveryZonesQuery.data
    ? resolveZonePreview(deliveryZonesQuery.data, isBuyNow ? "" : (cartQuery.data?.city ?? ""))
    : undefined;
  const codHandlingFee = resolvedZone?.codHandlingFee ?? 0;

  if (isBuyNow) {
    if (!buyNow.payload) {
      return (
        <div className="py-14 text-center">
          <p className="text-sm text-muted-foreground">
            This item is no longer available to buy now.
          </p>
          <Button asChild className="mt-5">
            <Link href="/">Start shopping</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="py-6">
        <CheckoutForm
          cart={buildBuyNowCart(buyNow.payload, resolvedZone)}
          codHandlingFee={codHandlingFee}
          buyNow={buyNow.payload}
        />
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
      <CheckoutForm cart={cart} codHandlingFee={codHandlingFee} />
    </div>
  );
};
