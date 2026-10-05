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

const buildOrder = (fulfilmentStatus: string) => ({
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
  items: [],
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
    mswServer.use(http.get(ORDER_URL, () => okJson(buildOrder("PACKED"))));

    renderOrder();

    expect(await screen.findByRole("button", { name: "Cancel order" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as returned" })).not.toBeInTheDocument();
  });
});
