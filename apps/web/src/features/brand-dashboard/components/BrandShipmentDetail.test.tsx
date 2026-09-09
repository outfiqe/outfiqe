import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrandShipmentDetail as BrandShipmentDetailData } from "../api/brandFulfilmentSchemas";
import { useAdvanceShipment } from "../hooks/useAdvanceShipment";
import { useBrandShipment } from "../hooks/useBrandShipment";
import { BrandShipmentDetail } from "./BrandShipmentDetail";

vi.mock("../hooks/useBrandShipment", () => ({ useBrandShipment: vi.fn() }));
vi.mock("../hooks/useAdvanceShipment", () => ({ useAdvanceShipment: vi.fn() }));
vi.mock("./MarkShipmentShippedModal", () => ({
  MarkShipmentShippedModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Mark as shipped" /> : null,
}));
vi.mock("./RequestShipmentCancellationModal", () => ({
  RequestShipmentCancellationModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Request cancellation" /> : null,
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mutateAsync = vi.fn().mockResolvedValue(undefined);

const buildIdleAdvanceMutation = (): ReturnType<typeof useAdvanceShipment> => ({
  context: undefined,
  data: undefined,
  error: null,
  failureCount: 0,
  failureReason: null,
  isPaused: false,
  status: "idle",
  variables: undefined,
  submittedAt: 0,
  isError: false,
  isIdle: true,
  isPending: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync,
  reset: vi.fn(),
});

const buildShipment = (
  overrides: Partial<BrandShipmentDetailData> = {},
): BrandShipmentDetailData => ({
  id: "grp-1",
  orderId: "0123456789abcdef",
  orderCreatedAt: "2026-09-01T00:00:00.000Z",
  status: "PLACED",
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
      productId: "p-1",
      productName: "Linen Shirt",
      imageUrl: null,
      sizeLabel: "M",
      qty: 2,
      unitPrice: 800,
      listUnitPrice: 1000,
      brandDiscountAmount: 200,
      platformDiscountAmount: 0,
    },
  ],
  shipTo: {
    fullName: "Buyer Person",
    phone: "9812345678",
    address: "42 Delivery Road",
    city: "Kathmandu",
    landmark: null,
  },
  payout: { lines: [], grossAmount: 1600, platformFee: 160, gatewayFee: 0, netAmount: 1440 },
  shipToCity: "Kathmandu",
  orderPaymentStatus: "DUE",
  orderFulfilmentSummary: "UNFULFILLED",
  ...overrides,
});

const mockShipment = (value: Partial<ReturnType<typeof useBrandShipment>>) => {
  vi.mocked(useBrandShipment).mockReturnValue({
    data: buildShipment(),
    isPending: false,
    isError: false,
    ...value,
  } as ReturnType<typeof useBrandShipment>);
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAdvanceShipment).mockReturnValue(buildIdleAdvanceMutation());
  mockShipment({});
});

describe("BrandShipmentDetail", () => {
  it("shows the buyer contact, items, payout and a Mark packed action for a placed shipment", () => {
    render(<BrandShipmentDetail groupId="grp-1" />);

    expect(screen.getByRole("heading", { name: /Order 01234567/ })).toBeInTheDocument();
    expect(screen.getByText("Buyer Person")).toBeInTheDocument();
    expect(screen.getByText("9812345678")).toBeInTheDocument();
    expect(screen.getByText("Linen Shirt")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,440")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark packed" })).toBeInTheDocument();
  });

  it("calls the advance mutation when Mark packed is pressed", () => {
    render(<BrandShipmentDetail groupId="grp-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark packed" }));

    expect(mutateAsync).toHaveBeenCalledWith({ status: "PACKED" });
  });

  it("opens the shipped modal instead of mutating directly for a packed shipment", () => {
    mockShipment({ data: buildShipment({ status: "PACKED" }) });
    render(<BrandShipmentDetail groupId="grp-1" />);

    fireEvent.click(screen.getByRole("button", { name: "Mark shipped" }));

    expect(screen.getByRole("dialog", { name: "Mark as shipped" })).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("hides fulfilment actions once a cancellation has been requested", () => {
    mockShipment({
      data: buildShipment({
        status: "PACKED",
        cancellationRequestedAt: "2026-09-02T00:00:00.000Z",
        cancellationReason: "Sold out in store",
      }),
    });
    render(<BrandShipmentDetail groupId="grp-1" />);

    expect(screen.getByText(/Cancellation requested — Sold out in store/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mark/ })).not.toBeInTheDocument();
  });

  it("shows an error banner when the shipment fails to load", () => {
    mockShipment({ data: undefined, isError: true });
    render(<BrandShipmentDetail groupId="grp-1" />);

    expect(screen.getByText(/couldn.t load this shipment/i)).toBeInTheDocument();
  });
});
