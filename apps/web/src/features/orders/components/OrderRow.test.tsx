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

  it("labels an unpaid cash-on-delivery order as COD due", () => {
    render(<OrderRow order={buildOrderSummary({ paymentMethod: "COD", paymentStatus: "DUE" })} />);

    expect(screen.getByText("COD due")).toBeInTheDocument();
  });

  it("labels a cancelled unpaid order as having nothing to pay", () => {
    render(
      <OrderRow
        order={buildOrderSummary({
          paymentMethod: "COD",
          paymentStatus: "DUE",
          fulfilmentStatus: "CANCELLED",
        })}
      />,
    );

    expect(screen.getByText("Nothing to pay")).toBeInTheDocument();
    expect(screen.queryByText("COD due")).not.toBeInTheDocument();
  });

  it("shows the raw payment status for a paid order", () => {
    render(
      <OrderRow order={buildOrderSummary({ paymentMethod: "ESEWA", paymentStatus: "PAID" })} />,
    );

    expect(screen.getByText("PAID")).toBeInTheDocument();
  });

  it("shows a thumbnail and a multi-item summary when there is more than one item", () => {
    render(
      <OrderRow
        order={buildOrderSummary({
          itemCount: 3,
          firstItemImageUrl: "https://cdn.example.com/jacket.jpg",
          firstItemProductName: "Denim Trucker Jacket",
        })}
      />,
    );

    expect(screen.getByText(/Denim Trucker Jacket/)).toBeInTheDocument();
    expect(screen.getByText(/and 2 more/)).toBeInTheDocument();
  });
});
