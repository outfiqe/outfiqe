"use client";

import { Button } from "@outfiqe/design-system";
import Link from "next/link";

import type { Cart } from "../api/cartSchemas";

type CartSummaryProps = {
  cart: Cart;
};

export const CartSummary = ({ cart }: CartSummaryProps) => {
  const { subtotal, deliveryFee, total, city } = cart;

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-foreground">
        Order summary
      </div>

      <div className="flex justify-between py-2 text-sm text-muted-foreground">
        <span>Subtotal</span>
        <span>Rs. {subtotal.toLocaleString()}</span>
      </div>
      <div className="flex justify-between py-2 text-sm text-muted-foreground">
        <span>{city ? `Delivery to ${city}` : "Delivery"}</span>
        <span>{deliveryFee === 0 ? "Free" : `Rs. ${deliveryFee.toLocaleString()}`}</span>
      </div>
      <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-foreground">
        <span>Total</span>
        <span>Rs. {total.toLocaleString()}</span>
      </div>

      <Button asChild className="mt-4 w-full">
        <Link href="/checkout">Checkout</Link>
      </Button>
    </div>
  );
};
