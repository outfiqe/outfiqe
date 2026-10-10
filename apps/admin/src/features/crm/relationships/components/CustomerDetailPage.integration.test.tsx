import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
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

describe("CustomerDetailPage", () => {
  it("renders the customer summary and recent orders", async () => {
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
                paymentStatus: "PAID",
                fulfilmentStatus: "DELIVERED",
                createdAt: "2026-08-20T00:00:00.000Z",
              },
            ],
          },
        }),
      ),
    );

    renderDetail("/_authenticated/crm/customers/c-1");

    expect(await screen.findByRole("heading", { name: "Sita Shopper" })).toBeInTheDocument();
    expect(screen.getByText(/Rs. 12,000 paid/)).toBeInTheDocument();
    expect(screen.getByText(/paid \/ delivered/)).toBeInTheDocument();
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
