import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { BrandShipmentSummary } from "../api/brandFulfilmentSchemas";
import { BrandShipmentRow } from "./BrandShipmentRow";

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const buildShipment = (overrides: Partial<BrandShipmentSummary> = {}): BrandShipmentSummary => ({
  id: "grp-1",
  orderId: "0123456789abcdef",
  orderCreatedAt: "2026-09-01T00:00:00.000Z",
  status: "PLACED",
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
  deliveredAt: null,
  cancellationRequestedAt: null,
  itemCount: 1,
  totalQty: 2,
  firstItemImageUrl: null,
  firstItemProductName: "Linen Shirt",
  shipToCity: "Kathmandu",
  orderPaymentStatus: "DUE",
  orderFulfilmentSummary: "UNFULFILLED",
  ...overrides,
});

describe("BrandShipmentRow", () => {
  it("links to the shipment detail page and shows the status and destination", () => {
    render(<BrandShipmentRow shipment={buildShipment()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/manage-orders/grp-1");
    expect(screen.getByText("To pack")).toBeInTheDocument();
    expect(screen.getByText(/Ship to Kathmandu/)).toBeInTheDocument();
    expect(screen.getByText(/Order 01234567/)).toBeInTheDocument();
  });

  it("summarises multiple products and surfaces a cancellation request", () => {
    render(
      <BrandShipmentRow
        shipment={buildShipment({
          itemCount: 3,
          cancellationRequestedAt: "2026-09-02T00:00:00.000Z",
          status: "PACKED",
        })}
      />,
    );

    expect(screen.getByText("Linen Shirt + 2 more")).toBeInTheDocument();
    expect(screen.getByText("Cancellation requested")).toBeInTheDocument();
    expect(screen.getByText("Packed")).toBeInTheDocument();
  });
});
