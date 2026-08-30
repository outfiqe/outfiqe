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

import { BillingReturnPage } from "./BillingReturnPage";

const API_BASE = "http://localhost:3000/api";

const renderReturnPage = (initialPath: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const returnRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/billing/return",
    validateSearch: (search: Record<string, unknown>) => ({
      invoiceId: typeof search.invoiceId === "string" ? search.invoiceId : "",
    }),
    component: BillingReturnPage,
  });
  const billingRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/billing" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([returnRoute, billingRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("BillingReturnPage", () => {
  it("confirms a completed payment", async () => {
    mswServer.use(
      http.post(`${API_BASE}/crm/billing/invoices/inv-1/verify`, () =>
        HttpResponse.json({ success: true, data: { status: "COMPLETE" } }),
      ),
    );

    renderReturnPage("/_authenticated/crm/billing/return?invoiceId=inv-1");

    expect(
      await screen.findByText("Payment received. Your subscription is active."),
    ).toBeInTheDocument();
  });

  it("explains a still-pending payment", async () => {
    mswServer.use(
      http.post(`${API_BASE}/crm/billing/invoices/inv-2/verify`, () =>
        HttpResponse.json({ success: true, data: { status: "PENDING" } }),
      ),
    );

    renderReturnPage("/_authenticated/crm/billing/return?invoiceId=inv-2");

    expect(await screen.findByText(/haven't received confirmation/i)).toBeInTheDocument();
  });

  it("shows an error when the link has no invoice reference", async () => {
    renderReturnPage("/_authenticated/crm/billing/return");

    expect(
      await screen.findByText("This link is missing an invoice reference."),
    ).toBeInTheDocument();
  });
});
