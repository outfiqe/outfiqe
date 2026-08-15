"use client";

import { Button } from "@outfiqe/design-system";

import type { Cart } from "@/features/cart";

import { PaymentMethod, type PaymentMethodValue } from "../api/checkoutSchemas";
import { COD_HANDLING_FEE } from "../checkout.constants";

type CheckoutSummaryProps = {
  cart: Cart;
  paymentMethod: PaymentMethodValue;
  isSubmitting: boolean;
};

export const CheckoutSummary = ({ cart, paymentMethod, isSubmitting }: CheckoutSummaryProps) => {
  const { subtotal, deliveryFee } = cart;
  const codFee = paymentMethod === PaymentMethod.COD ? COD_HANDLING_FEE : 0;
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

      <Button type="submit" className="mt-4 w-full" disabled={isSubmitting}>
        {isSubmitting
          ? "Placing order…"
          : paymentMethod === PaymentMethod.COD
            ? "Place order"
            : `Pay Rs. ${total.toLocaleString()}`}
      </Button>
    </div>
  );
};
