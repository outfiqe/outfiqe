"use client";

import { Button } from "@outfiqe/design-system";

import type { Cart } from "@/features/cart";

import { PaymentMethod, type PaymentMethodValue } from "../api/checkoutSchemas";

type CheckoutSummaryProps = {
  cart: Cart;
  paymentMethod: PaymentMethodValue;
  codHandlingFee: number;
  isSubmitting: boolean;
  isOnline: boolean;
};

export const CheckoutSummary = ({
  cart,
  paymentMethod,
  codHandlingFee,
  isSubmitting,
  isOnline,
}: CheckoutSummaryProps) => {
  const { subtotal, deliveryFee } = cart;
  const codFee = paymentMethod === PaymentMethod.COD ? codHandlingFee : 0;
  const total = subtotal + deliveryFee + codFee;

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
        <span>Delivery</span>
        <span>{deliveryFee === 0 ? "Free" : `Rs. ${deliveryFee.toLocaleString()}`}</span>
      </div>
      {codFee > 0 && (
        <div className="flex justify-between py-2 text-sm text-muted-foreground">
          <span>COD handling</span>
          <span>Rs. {codFee.toLocaleString()}</span>
        </div>
      )}
      <div className="mt-2 flex justify-between border-t border-border pt-3 font-display text-lg font-extrabold text-foreground">
        <span>Total</span>
        <span>Rs. {total.toLocaleString()}</span>
      </div>

      {!isOnline && (
        <p role="status" className="mt-3 text-xs text-destructive">
          Checkout needs a connection. Try again once you&apos;re back online.
        </p>
      )}

      <Button type="submit" className="mt-4 w-full" disabled={isSubmitting || !isOnline}>
        {isSubmitting
          ? "Placing order…"
          : !isOnline
            ? "You're offline"
            : paymentMethod === PaymentMethod.COD
              ? "Place order"
              : `Pay Rs. ${total.toLocaleString()}`}
      </Button>
    </div>
  );
};
