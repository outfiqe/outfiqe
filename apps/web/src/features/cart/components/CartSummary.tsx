"use client";

import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import { summarizeDeliveryFees, useDeliveryZones } from "@/features/delivery-zones";
import { formatRupees } from "@/shared/lib/formatRupees";

import type { Cart } from "../api/cartSchemas";
import { CouponForm } from "./CouponForm";

type CartSummaryProps = {
  cart: Cart;
};

export const CartSummary = ({ cart }: CartSummaryProps) => {
  const { items, subtotal, deliveryFee, platformDiscountTotal, total, city, appliedCoupon } = cart;
  const hasUnavailableItems = items.some((cartItem) => cartItem.soldOut);
  const { data: deliveryZones } = useDeliveryZones();
  const hasDeliveryCity = city !== null;
  const lowestDeliveryFee = summarizeDeliveryFees(deliveryZones ?? [])?.lowestFee;
  const totalLabel = hasDeliveryCity ? "Total" : "Total before delivery";
  const totalAmount = hasDeliveryCity ? total : total - deliveryFee;

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground">
        Order summary
      </div>

      <div className="mb-3">
        <CouponForm appliedCoupon={appliedCoupon} />
      </div>

      <div className="flex justify-between py-2 text-sm text-muted-foreground">
        <span>Subtotal</span>
        <span>Rs. {subtotal.toLocaleString()}</span>
      </div>
      {appliedCoupon && (
        <div className="flex justify-between py-2 text-sm text-primary-strong">
          <span>{appliedCoupon.code}</span>
          <span>-Rs. {platformDiscountTotal.toLocaleString()}</span>
        </div>
      )}
      <div className="flex justify-between py-2 text-sm text-muted-foreground">
        <span>{hasDeliveryCity ? `Delivery to ${city}` : "Delivery"}</span>
        {hasDeliveryCity ? (
          <span>{deliveryFee === 0 ? "Free" : formatRupees(deliveryFee)}</span>
        ) : (
          <span>
            {lowestDeliveryFee === undefined
              ? "Added once you choose a city"
              : `From ${formatRupees(lowestDeliveryFee)}`}
          </span>
        )}
      </div>
      {!hasDeliveryCity && (
        <p className="pb-2 text-xs text-muted-foreground">
          Add your city above to see the exact delivery fee.
        </p>
      )}
      <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-foreground">
        <span>{totalLabel}</span>
        <span>{formatRupees(totalAmount)}</span>
      </div>

      {hasUnavailableItems ? (
        <>
          <Button disabled className="mt-4 w-full">
            Checkout
          </Button>
          <p role="status" className="mt-2 text-center text-xs text-destructive">
            Remove the unavailable items from your bag to check out.
          </p>
        </>
      ) : (
        <Button asChild className="mt-4 w-full">
          <Link href="/checkout">Checkout</Link>
        </Button>
      )}
    </div>
  );
};
