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

import { PartnerDetailPage } from "./PartnerDetailPage";

const API_BASE = "http://localhost:3000/api";

const renderDetail = (initialPath: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/partners/$creatorId",
    component: PartnerDetailPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/partners" });
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

describe("PartnerDetailPage", () => {
  it("renders the per-product breakdown and recent orders", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/partners/c-1`, () =>
        HttpResponse.json({
          success: true,
          data: {
            creatorId: "c-1",
            name: "Aasha Muse",
            handle: "aasha",
            avatarUrl: null,
            tagClickCount: 12,
            attributedOrderCount: 2,
            attributedRevenue: 3000,
            lastActivityAt: "2026-08-20T00:00:00.000Z",
            productBreakdown: [
              {
                productId: "p-1",
                productName: "Graphic Tee",
                imageUrl: "https://img.test/tee.jpg",
                price: 1500,
                isThrift: false,
                isLive: true,
                tagClickCount: 12,
                attributedOrderCount: 2,
                attributedRevenue: 3000,
              },
            ],
            recentAttributedOrders: [
              {
                orderItemId: "oi-1",
                orderId: "o-1",
                productName: "Graphic Tee",
                qty: 1,
                unitPrice: 1500,
                paymentStatus: "PAID",
                fulfilmentStatus: "DELIVERED",
                createdAt: "2026-08-20T00:00:00.000Z",
              },
            ],
          },
        }),
      ),
    );

    renderDetail("/_authenticated/crm/partners/c-1");

    expect(await screen.findByRole("heading", { name: "Aasha Muse" })).toBeInTheDocument();
    expect(screen.getByText("Graphic Tee")).toBeInTheDocument();
    expect(screen.getByText("Graphic Tee × 1")).toBeInTheDocument();
    expect(screen.getByText(/Paid · Delivered/)).toBeInTheDocument();
  });

  it("shows a product's picture and opens its details from the row", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/partners/c-1`, () =>
        HttpResponse.json({
          success: true,
          data: {
            creatorId: "c-1",
            name: "Aasha Muse",
            handle: "aasha",
            avatarUrl: null,
            tagClickCount: 2,
            attributedOrderCount: 0,
            attributedRevenue: 0,
            lastActivityAt: null,
            productBreakdown: [
              {
                productId: "p-1",
                productName: "Oversized Coat",
                imageUrl: "https://img.test/coat.jpg",
                price: 4500,
                isThrift: true,
                isLive: true,
                tagClickCount: 2,
                attributedOrderCount: 0,
                attributedRevenue: 0,
              },
              {
                productId: "p-2",
                productName: "Hidden Scarf",
                imageUrl: null,
                price: 900,
                isThrift: false,
                isLive: false,
                tagClickCount: 1,
                attributedOrderCount: 0,
                attributedRevenue: 0,
              },
            ],
            recentAttributedOrders: [],
          },
        }),
      ),
    );

    renderDetail("/_authenticated/crm/partners/c-1");
    const user = userEvent.setup({ delay: null });

    const coatRow = await screen.findByRole("button", { name: /Oversized Coat/ });
    expect(within(coatRow).getByRole("img", { name: "Oversized Coat" })).toHaveAttribute(
      "src",
      "https://img.test/coat.jpg",
    );

    await user.click(coatRow);
    const panel = await screen.findByRole("dialog", { name: "Oversized Coat" });
    expect(within(panel).getByText("Rs. 4,500")).toBeInTheDocument();
    expect(within(panel).getByText("Thrift")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: "See it on Outfiqe" })).toHaveAttribute(
      "href",
      expect.stringContaining("/product/p-1"),
    );
  });

  it("surfaces a 404 as an error banner", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/crm/partners/missing`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "Partner not found.",
              code: "PARTNER_NOT_FOUND",
            }),
            { status: 404 },
          ),
      ),
    );

    renderDetail("/_authenticated/crm/partners/missing");

    expect(await screen.findByText("Partner not found.")).toBeInTheDocument();
  });
});
