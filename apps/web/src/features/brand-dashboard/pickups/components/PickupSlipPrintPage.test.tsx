import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrandShipmentDetail } from "../../shipments/api/brandFulfilmentSchemas";
import { useBrandShipment } from "../../shipments/hooks/useBrandShipment";
import { PickupSlipPrintPage } from "./PickupSlipPrintPage";

vi.mock("../../shipments/hooks/useBrandShipment", () => ({ useBrandShipment: vi.fn() }));

const buildShipment = (overrides: Partial<BrandShipmentDetail> = {}): BrandShipmentDetail => ({
  id: "grp-1",
  orderId: "0123456789abcdef",
  orderCreatedAt: "2026-10-15T00:00:00.000Z",
  status: "PACKED",
  fulfilmentMode: "OUTFIQE_LOGISTICS",
  pickupStatus: "READY_FOR_PICKUP",
  pickupCode: "7K2M9QAB",
  readyForPickupAt: "2026-10-15T08:00:00.000Z",
  pickedUpAt: null,
  carrier: null,
  trackingNumber: null,
  packedAt: null,
  shippedAt: null,
  deliveredAt: null,
  cancellationRequestedAt: null,
  cancellationReason: null,
  items: [
    {
      id: "item-1",
      productId: "product-1",
      productName: "Linen Shirt",
      imageUrl: null,
      sizeLabel: "M",
      qty: 2,
      unitPrice: 1000,
      listUnitPrice: 1000,
      brandDiscountAmount: 0,
      platformDiscountAmount: 0,
    },
  ],
  shipTo: null,
  payout: { lines: [], grossAmount: 0, platformFee: 0, gatewayFee: 0, netAmount: 0 },
  shipToCity: "Kathmandu",
  orderPaymentStatus: "PAID",
  orderFulfilmentSummary: "UNFULFILLED",
  ...overrides,
});

const mockShipment = (shipment: BrandShipmentDetail | undefined, isError = false) =>
  vi.mocked(useBrandShipment).mockReturnValue({
    data: shipment,
    isPending: shipment === undefined && !isError,
    isError,
  } as ReturnType<typeof useBrandShipment>);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PickupSlipPrintPage", () => {
  it("prints the order, the pickup code and what is in the bag", () => {
    mockShipment(buildShipment());
    render(<PickupSlipPrintPage fulfilmentGroupId="grp-1" />);

    expect(screen.getByRole("heading", { name: "Order 01234567" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Pickup code 7K2M9QAB" })).toBeInTheDocument();
    expect(screen.getByText("2 items in this bag")).toBeInTheDocument();
    expect(screen.getByText("Linen Shirt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });

  it("explains that an order the brand ships has no pickup slip", () => {
    mockShipment(buildShipment({ fulfilmentMode: "BRAND_SHIPS", pickupCode: null }));
    render(<PickupSlipPrintPage fulfilmentGroupId="grp-1" />);

    expect(screen.getByText(/isn't collected by Outfiqe/)).toBeInTheDocument();
  });

  it("shows an error when the order can't be loaded", () => {
    mockShipment(undefined, true);
    render(<PickupSlipPrintPage fulfilmentGroupId="grp-1" />);

    expect(screen.getByText(/couldn't load this pickup slip/)).toBeInTheDocument();
  });
});
