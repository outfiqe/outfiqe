import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Cart } from "@/features/cart";

import { PaymentMethod } from "../api/checkoutSchemas";
import { CheckoutSummary } from "./CheckoutSummary";

const aCart = (overrides: Partial<Cart> = {}): Cart =>
  ({
    subtotal: 1000,
    deliveryFee: 100,
    city: "Kathmandu",
    ...overrides,
  }) as Cart;

describe("CheckoutSummary", () => {
  it("offers to place the order when there is a connection", () => {
    render(
      <CheckoutSummary
        cart={aCart()}
        paymentMethod={PaymentMethod.COD}
        codHandlingFee={50}
        isSubmitting={false}
        isOnline={true}
      />,
    );

    expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
    expect(screen.queryByText(/checkout needs a connection/i)).not.toBeInTheDocument();
  });

  it("disables checkout and explains why once the connection drops", () => {
    render(
      <CheckoutSummary
        cart={aCart()}
        paymentMethod={PaymentMethod.COD}
        codHandlingFee={50}
        isSubmitting={false}
        isOnline={false}
      />,
    );

    expect(screen.getByRole("button", { name: "You're offline" })).toBeDisabled();
    expect(screen.getByText(/checkout needs a connection/i)).toBeInTheDocument();
  });

  it("stays disabled while genuinely offline even if a submission were already in flight", () => {
    render(
      <CheckoutSummary
        cart={aCart()}
        paymentMethod={PaymentMethod.ESEWA}
        codHandlingFee={50}
        isSubmitting={true}
        isOnline={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Placing order…" })).toBeDisabled();
  });
});
