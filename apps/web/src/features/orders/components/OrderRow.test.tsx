import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { OrderSummary } from "../api/orderSchemas";
import { OrderRow } from "./OrderRow";

const buildOrderSummary = (overrides: Partial<OrderSummary> = {}): OrderSummary => ({
  id: "cb34b663-ef6b-495a-bd6f-cafcbb243ecf",
  createdAt: "2026-09-01T00:00:00.000Z",
  fullName: "Test Buyer",
  paymentMethod: "COD",
  paymentStatus: "DUE",
  fulfilmentStatus: "PLACED",
  fulfilmentSummary: "UNFULFILLED",
  subtotal: 2500,
  deliveryFee: 100,
  codFee: 0,
  total: 2600,
  refundedAmount: 0,
  promisedDelivery: null,
  itemCount: 1,
  firstItemImageUrl: null,
  firstItemProductName: "Denim Trucker Jacket",
  ...overrides,
});

describe("OrderRow", () => {
  it("shows a short order reference and links to the full order", () => {
    render(<OrderRow order={buildOrderSummary()} />);

    expect(screen.getByText("#CB34B663")).toBeInTheDocument();
    expect(screen.queryByText("cb34b663-ef6b-495a-bd6f-cafcbb243ecf")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/orders/cb34b663-ef6b-495a-bd6f-cafcbb243ecf",
    );
  });
});
