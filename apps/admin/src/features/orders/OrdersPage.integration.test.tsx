import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OrdersPage } from "./OrdersPage";

const ORDERS_URL = "http://localhost:3000/api/orders/admin";

const buildOrder = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "order-1",
  createdAt: "2026-01-05T00:00:00.000Z",
  fullName: "Asha Rai",
  paymentMethod: "COD",
  paymentStatus: "PAID",
  fulfilmentStatus: "PLACED",
  subtotal: 2400,
  deliveryFee: 0,
  codFee: 0,
  total: 2400,
  buyerName: "Asha Rai",
  buyerEmail: "asha@example.com",
  needsManualRefund: false,
  itemCount: 1,
  firstItemImageUrl: null,
  firstItemProductName: "Wide-leg trousers",
  ...overrides,
});

const stubOrders = () => {
  const requestedStatuses: (string | null)[] = [];
  mswServer.use(
    http.get(ORDERS_URL, ({ request }) => {
      requestedStatuses.push(new URL(request.url).searchParams.get("status"));
      return HttpResponse.json({
        success: true,
        data: { orders: [buildOrder()], nextCursor: null },
      });
    }),
  );
  return requestedStatuses;
};

describe("OrdersPage", () => {
  it("requests all orders and marks the All tab active with no status param", async () => {
    const requestedStatuses = stubOrders();
    renderWithRouter(<OrdersPage />, { path: "/orders" });

    expect(await screen.findByText("Asha Rai")).toBeInTheDocument();
    await waitFor(() => expect(requestedStatuses).toContain(null));
  });

  it("reads the status filter from the URL on load", async () => {
    const requestedStatuses = stubOrders();
    renderWithRouter(<OrdersPage />, { path: "/orders", initialEntry: "/orders?status=SHIPPED" });

    await screen.findByText("Asha Rai");
    await waitFor(() => expect(requestedStatuses).toContain("SHIPPED"));
  });

  it("puts the chosen status in the URL and refetches", async () => {
    const requestedStatuses = stubOrders();
    const user = userEvent.setup();
    const { router } = renderWithRouter(<OrdersPage />, { path: "/orders" });

    await user.click(await screen.findByRole("button", { name: "Placed" }));

    await waitFor(() => expect(router.state.location.search).toEqual({ status: "PLACED" }));
    await waitFor(() => expect(requestedStatuses).toContain("PLACED"));
  });

  it("clears the status param when All is picked again", async () => {
    stubOrders();
    const user = userEvent.setup();
    const { router } = renderWithRouter(<OrdersPage />, {
      path: "/orders",
      initialEntry: "/orders?status=PLACED",
    });

    await user.click(await screen.findByRole("button", { name: "All" }));

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });
});
