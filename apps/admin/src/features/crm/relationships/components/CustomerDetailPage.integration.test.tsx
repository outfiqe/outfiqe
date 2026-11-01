import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CustomerDetailPage } from "./CustomerDetailPage";

const API_BASE = "http://localhost:3000/api";

const renderDetail = (initialPath: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/customers/$userId",
    component: CustomerDetailPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/customers" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute, listRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const mockCustomerWithOrder = () => {
  mswServer.use(
    http.get(`${API_BASE}/crm/timeline`, () =>
      HttpResponse.json({ success: true, data: { entries: [], partial: false } }),
    ),
    http.get(`${API_BASE}/crm/customers/c-1`, () =>
      HttpResponse.json({
        success: true,
        data: {
          userId: "c-1",
          name: "Sita Shopper",
          handle: "sita",
          avatarUrl: null,
          orderCount: 2,
          itemCount: 3,
          totalPaid: 12000,
          firstOrderAt: "2026-08-10T00:00:00.000Z",
          lastOrderAt: "2026-08-20T00:00:00.000Z",
          recentOrders: [
            {
              orderId: "o-1",
              itemCount: 2,
              brandSubtotal: 8000,
              paymentMethod: "ESEWA",
              paymentStatus: "PAID",
              fulfilmentStatus: "DELIVERED",
              deliveredAt: "2026-08-22T00:00:00.000Z",
              createdAt: "2026-08-20T00:00:00.000Z",
              lines: [
                {
                  orderItemId: "oi-1",
                  productId: "p-oi-1",
                  productName: "Oversized Coat",
                  imageUrl: "https://img.test/coat.jpg",
                  sizeLabel: "M",
                  qty: 1,
                  unitPrice: 6500,
                  refundedQty: 1,
                  isLive: true,
                },
                {
                  orderItemId: "oi-2",
                  productId: "p-oi-2",
                  productName: "Graphic Tee",
                  imageUrl: null,
                  sizeLabel: "M",
                  qty: 1,
                  unitPrice: 1500,
                  refundedQty: 0,
                  isLive: false,
                },
              ],
            },
          ],
        },
      }),
    ),
  );
};

describe("CustomerDetailPage", () => {
  it("renders the customer summary and recent orders", async () => {
    mockCustomerWithOrder();

    renderDetail("/_authenticated/crm/customers/c-1");

    expect(await screen.findByRole("heading", { name: "Sita Shopper" })).toBeInTheDocument();
    expect(screen.getByText("Rs. 12,000")).toBeInTheDocument();
    expect(screen.getByText(/2 items · Paid · Delivered/)).toBeInTheDocument();

    const orderRow = screen.getByRole("button", { name: /Oversized Coat \+ 1 more/ });
    expect(within(orderRow).getByRole("img", { name: "Oversized Coat" })).toHaveAttribute(
      "src",
      "https://img.test/coat.jpg",
    );
  });

  it("opens an order's products and details from its row", async () => {
    mockCustomerWithOrder();
    renderDetail("/_authenticated/crm/customers/c-1");
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: /Oversized Coat \+ 1 more/ }));

    expect(await screen.findByText("Order #O-1")).toBeInTheDocument();
    expect(screen.getByText(/Size M × 1 · 1 refunded/)).toBeInTheDocument();
    expect(screen.getByText("eSewa")).toBeInTheDocument();
    expect(screen.getByText("Only your products from this order are shown.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "See it on Outfiqe" })).toHaveLength(1);
  });

  it("surfaces a 404 as an error banner", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/timeline`, () =>
        HttpResponse.json({ success: true, data: { entries: [], partial: false } }),
      ),
      http.get(
        `${API_BASE}/crm/customers/missing`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Customer not found." }), {
            status: 404,
          }),
      ),
    );

    renderDetail("/_authenticated/crm/customers/missing");

    expect(await screen.findByText("Customer not found.")).toBeInTheDocument();
  });
});
