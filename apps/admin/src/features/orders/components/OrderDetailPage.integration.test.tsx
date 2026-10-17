import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OrderDetailPage } from "./OrderDetailPage";

const ORDER_URL = "http://localhost:3000/api/orders/admin/order-1";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const REFUNDS_URL = `${ORDER_URL}/refunds`;

const noRefunds = () => http.get(REFUNDS_URL, () => okJson({ refunds: [] }));

const shirtItem = {
  id: "item-1",
  productId: "product-1",
  productName: "Linen Shirt",
  brandName: "Aurora Label",
  imageUrl: null,
  sizeLabel: "M",
  qty: 2,
  refundedQty: 1,
  unitPrice: 1200,
  attributedCreatorName: null,
};

const buildOrder = (fulfilmentStatus: string, items: (typeof shirtItem)[] = []) => ({
  id: "order-1",
  createdAt: "2026-10-01T00:00:00.000Z",
  fullName: "Asha Rai",
  phone: "9800000000",
  address: "Baneshwor",
  city: "Kathmandu",
  landmark: null,
  paymentMethod: "COD",
  paymentStatus: "DUE",
  fulfilmentStatus,
  subtotal: 2400,
  deliveryFee: 0,
  codFee: 0,
  total: 2400,
  refundedAmount: 0,
  items,
  transactions: [],
  buyerName: "Asha Rai",
  buyerEmail: "asha@example.com",
  needsManualRefund: false,
});

const renderOrder = () =>
  renderWithRouter(
    <>
      <OrderDetailPage orderId="order-1" />
      <Toaster />
    </>,
    { path: "/orders/order-1" },
  );

describe("OrderDetailPage", () => {
  it("marks a delivered order as returned with a reason, and warns when earnings were already paid out", async () => {
    let returnBody: unknown;
    mswServer.use(
      http.get(ORDER_URL, () => okJson(buildOrder("DELIVERED"))),
      noRefunds(),
      http.post(`${ORDER_URL}/return`, async ({ request }) => {
        returnBody = await request.json();
        return okJson({
          voidedCommissionCount: 0,
          voidedPayoutCount: 1,
          paidCommissionCount: 1,
          withdrawnPayoutCount: 0,
          needsClawback: true,
          refunded: null,
        });
      }),
    );
    const user = userEvent.setup();
    renderOrder();

    await user.click(await screen.findByRole("button", { name: "Mark as returned" }));
    const returnDialog = await screen.findByRole("dialog");
    await user.type(within(returnDialog).getByLabelText("What happened to the parcel?"), "Refused");
    await user.click(within(returnDialog).getByRole("button", { name: "Mark as returned" }));

    await waitFor(() => expect(returnBody).toEqual({ reason: "Refused" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Some earnings from this order were already paid out.",
    );
  });

  it("only offers the return action once an order has shipped", async () => {
    mswServer.use(
      http.get(ORDER_URL, () => okJson(buildOrder("PACKED"))),
      noRefunds(),
    );

    renderOrder();

    expect(await screen.findByRole("button", { name: "Cancel order" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as returned" })).not.toBeInTheDocument();
  });

  it("refunds chosen units with a cause, reason and idempotency key, then lists the refund", async () => {
    let refundBody: unknown;
    let refundIdempotencyKey: string | null = null;
    const recordedRefund = {
      id: "refund-1",
      cause: "STAFF_ADJUSTMENT",
      reason: "Stitching came apart",
      status: "SUCCEEDED",
      method: "CASH_NOT_COLLECTED",
      goodsAmount: 1200,
      feeAmount: 0,
      totalAmount: 1200,
      transferReference: null,
      createdAt: "2026-10-02T00:00:00.000Z",
      settledAt: "2026-10-02T00:00:00.000Z",
      lines: [
        { orderItemId: "item-1", productName: "Linen Shirt", sizeLabel: "M", qty: 1, amount: 1200 },
      ],
    };
    let refunds: (typeof recordedRefund)[] = [];
    mswServer.use(
      http.get(ORDER_URL, () => okJson(buildOrder("PACKED", [shirtItem]))),
      http.get(REFUNDS_URL, () => okJson({ refunds })),
      http.post(REFUNDS_URL, async ({ request }) => {
        refundBody = await request.json();
        refundIdempotencyKey = request.headers.get("Idempotency-Key");
        refunds = [recordedRefund];
        return HttpResponse.json(
          { success: true, message: "ok", data: recordedRefund },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderOrder();

    expect(await screen.findByText("No refunds on this order.")).toBeInTheDocument();
    expect(screen.getByText(/Linen Shirt · M × 2 \(1 refunded\)/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refund items" }));
    const refundDialog = await screen.findByRole("dialog");
    const quantity = within(refundDialog).getByLabelText(/Linen Shirt · M/);
    expect(quantity.querySelectorAll("option")).toHaveLength(2);
    await user.selectOptions(quantity, "1");
    await user.type(
      within(refundDialog).getByLabelText("Note for the order history"),
      "Stitching came apart",
    );
    await user.click(within(refundDialog).getByLabelText("Put these units back on sale"));
    await user.click(within(refundDialog).getByRole("button", { name: "Refund" }));

    await waitFor(() =>
      expect(refundBody).toEqual({
        lines: [{ orderItemId: "item-1", qty: 1 }],
        cause: "STAFF_ADJUSTMENT",
        reason: "Stitching came apart",
        restock: true,
      }),
    );
    expect(refundIdempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByText("Rs. 1,200 · Staff adjustment")).toBeInTheDocument();
    expect(screen.getByText("Taken off the cash to collect")).toBeInTheDocument();
  });
});
