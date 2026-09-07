import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Order } from "../api/orderSchemas";
import { OrderDetailBody } from "./OrderDetailBody";

const mocks = vi.hoisted(() => ({
  orderResult: { data: undefined as Order | undefined, isLoading: false },
  initiate: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  redirectToPaymentGateway: vi.fn(),
  cancelOrder: vi.fn().mockResolvedValue(undefined),
}));

const { redirectToPaymentGateway, cancelOrder, orderResult } = mocks;
const initiateMutate = mocks.initiate.mutate;

vi.mock("../hooks/useOrder", () => ({
  useOrder: () => mocks.orderResult,
}));

vi.mock("@/features/payments", () => ({
  redirectToPaymentGateway: mocks.redirectToPaymentGateway,
  useInitiatePayment: () => mocks.initiate,
  isAlreadyPaidError: (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code: unknown }).code === "ALREADY_SETTLED"
      : false,
}));

vi.mock("../api/ordersApi", () => ({
  ordersApi: { cancel: (orderId: string, reason?: string) => mocks.cancelOrder(orderId, reason) },
}));

const buildOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "ORDER-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  fullName: "Test Buyer",
  phone: "9800000000",
  address: "Ganesh Marga",
  city: "Kathmandu",
  landmark: null,
  paymentMethod: "COD",
  paymentStatus: "DUE",
  fulfilmentStatus: "PLACED",
  subtotal: 2500,
  deliveryFee: 260,
  codFee: 0,
  total: 2760,
  items: [
    {
      id: "item-1",
      productId: "product-1",
      productName: "Stretch Wool Trousers",
      brandName: "Brand",
      imageUrl: null,
      sizeLabel: "XS",
      qty: 1,
      unitPrice: 2500,
      attributedCreatorName: null,
    },
  ],
  transactions: [],
  ...overrides,
});

const renderOrderDetail = () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<OrderDetailBody orderId="ORDER-1" />, { wrapper });
};

beforeEach(() => {
  orderResult.data = buildOrder();
  orderResult.isLoading = false;
});

afterEach(() => {
  initiateMutate.mockReset();
  redirectToPaymentGateway.mockReset();
  cancelOrder.mockClear();
  cancelOrder.mockResolvedValue(undefined);
  mocks.initiate.isPending = false;
  mocks.initiate.isError = false;
  mocks.initiate.error = null;
});

describe("OrderDetailBody", () => {
  it("shows a skeleton while the order is loading", () => {
    orderResult.data = undefined;
    orderResult.isLoading = true;

    const { container } = renderOrderDetail();

    expect(container.querySelector('[class*="animate-pulse"]')).toBeInTheDocument();
  });

  it("shows a not-found message when the order is missing", () => {
    orderResult.data = undefined;
    orderResult.isLoading = false;

    renderOrderDetail();

    expect(screen.getByText(/couldn't find that order/i)).toBeInTheDocument();
  });

  it("shows the delivery tracker for a paid order and no pending-payment panel", () => {
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "PAID" });

    renderOrderDetail();

    expect(screen.getByText("Order placed")).toBeInTheDocument();
    expect(screen.queryByText(/payment not completed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume payment/i })).not.toBeInTheDocument();
  });

  it("swaps the tracker for a pending-payment panel on an unpaid wallet order", () => {
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });

    renderOrderDetail();

    expect(screen.getByText(/payment not completed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume payment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel order/i })).toBeInTheDocument();
    expect(screen.queryByText("Order placed")).not.toBeInTheDocument();
  });

  it("shows a cancelled state with no payment panel once the order is cancelled", () => {
    orderResult.data = buildOrder({
      paymentMethod: "ESEWA",
      paymentStatus: "FAILED",
      fulfilmentStatus: "CANCELLED",
    });

    renderOrderDetail();

    expect(screen.getByText("This order was cancelled.")).toBeInTheDocument();
    expect(screen.queryByText(/payment not completed/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/payment of rs/i)).not.toBeInTheDocument();
  });

  it("hides the payment panel for a cancelled order even if its payment row is still INITIATED", () => {
    orderResult.data = buildOrder({
      paymentMethod: "ESEWA",
      paymentStatus: "INITIATED",
      fulfilmentStatus: "CANCELLED",
    });

    renderOrderDetail();

    expect(screen.getByText("This order was cancelled.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /resume payment/i })).not.toBeInTheDocument();
  });

  it("re-initiates payment for the order when Resume payment is clicked", async () => {
    const user = userEvent.setup();
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });

    renderOrderDetail();
    await user.click(screen.getByRole("button", { name: /resume payment/i }));

    expect(initiateMutate).toHaveBeenCalledWith(
      "ORDER-1",
      expect.objectContaining({ onSuccess: redirectToPaymentGateway }),
    );
  });

  it("cancels the order only after the confirm dialog is accepted", async () => {
    const user = userEvent.setup();
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });

    renderOrderDetail();
    await user.click(screen.getByRole("button", { name: /cancel order/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/can't be undone/i)).toBeInTheDocument();
    expect(cancelOrder).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: /yes, cancel/i }));

    expect(cancelOrder).toHaveBeenCalledWith("ORDER-1", undefined);
  });

  it("closes the confirm dialog without cancelling when Keep order is clicked", async () => {
    const user = userEvent.setup();
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });

    renderOrderDetail();
    await user.click(screen.getByRole("button", { name: /cancel order/i }));
    await user.click(screen.getByRole("button", { name: /keep order/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it("surfaces an error and a pending label when resuming payment fails", async () => {
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });
    mocks.initiate.isPending = true;
    mocks.initiate.isError = true;
    mocks.initiate.error = { code: "SERVER_ERROR", message: "Gateway is down" };

    renderOrderDetail();

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /starting/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel order/i })).toBeDisabled();
  });

  it("shows a positive note and locks the buttons when resume reports the order is already paid", () => {
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });
    mocks.initiate.isError = true;
    mocks.initiate.error = { code: "ALREADY_SETTLED" };

    renderOrderDetail();

    expect(screen.getByText(/already went through/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume payment/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel order/i })).toBeDisabled();
  });

  it("surfaces an error in the confirm dialog when cancelling fails", async () => {
    const user = userEvent.setup();
    orderResult.data = buildOrder({ paymentMethod: "ESEWA", paymentStatus: "INITIATED" });
    cancelOrder.mockRejectedValueOnce(new Error("network"));

    renderOrderDetail();
    await user.click(screen.getByRole("button", { name: /cancel order/i }));
    await user.click(screen.getByRole("button", { name: /yes, cancel/i }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/something went wrong/i)).toBeInTheDocument();
  });
});
