import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrandOrderItem } from "../api/brandOrdersSchemas";
import { BrandOrderRow } from "./BrandOrderRow";

const buildItem = (overrides: Partial<BrandOrderItem> = {}): BrandOrderItem => ({
  id: "oi-1",
  productId: "p-1",
  productName: "Linen Shirt",
  imageUrl: null,
  sizeLabel: "M",
  qty: 2,
  unitPrice: 1500,
  orderId: "order-42",
  orderCreatedAt: "2026-08-01T00:00:00.000Z",
  paymentStatus: "PAID",
  fulfilmentStatus: "PLACED",
  ...overrides,
});

describe("BrandOrderRow", () => {
  it("renders the product, quantity, price and status labels", () => {
    render(<BrandOrderRow item={buildItem()} />);

    expect(screen.getByText("Linen Shirt")).toBeInTheDocument();
    expect(screen.getByText(/Qty 2/)).toBeInTheDocument();
    expect(screen.getByText(/Rs\. 1,500/)).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
    expect(screen.getByText("PLACED")).toBeInTheDocument();
  });

  it("maps a cash-on-delivery, cancelled item to its labels", () => {
    render(
      <BrandOrderRow item={buildItem({ paymentStatus: "DUE", fulfilmentStatus: "CANCELLED" })} />,
    );

    expect(screen.getByText("Cash on delivery")).toBeInTheDocument();
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
  });
});
