import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformOverviewPage } from "./PlatformOverviewPage";

const API_BASE = "http://localhost:3000/api";
const OVERVIEW_URL = `${API_BASE}/platform/metrics/overview`;
const TREND_URL = `${API_BASE}/platform/metrics/activity-trend`;
const ROLLUP_URL = `${API_BASE}/admin/financial-rollup`;

const OVERVIEW = {
  tenantCount: 12,
  tenantsByPlan: [{ plan: "pro", count: 8 }],
  totalContacts: 340,
  totalDeals: 55,
  totalTickets: 9,
  totalActivities: 1200,
  totalMembers: 30,
};

const TREND = Array.from({ length: 20 }, (_, index) => ({
  date: `2026-08-${String(index + 1).padStart(2, "0")}`,
  activityCount: index * 3,
  dealCount: index,
  ticketCount: 0,
  contactCount: index * 2,
}));

const ROLLUP = {
  range: "30d",
  gateway: { grossCollected: 100000, refunded: 0, netHeld: 100000 },
  ledger: {
    owedToBrands: { PENDING: 30000, AVAILABLE: 15000 },
    owedToCreators: { PENDING: 10000, AVAILABLE: 5000 },
    platformRevenueRealized: 0,
  },
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: PlatformOverviewPage });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("PlatformOverviewPage", () => {
  it("renders totals, the activity chart and the settlement gap", async () => {
    mswServer.use(
      http.get(OVERVIEW_URL, () => HttpResponse.json({ success: true, data: OVERVIEW })),
      http.get(TREND_URL, () => HttpResponse.json({ success: true, data: TREND })),
      http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, data: ROLLUP })),
    );

    renderPage();

    expect(await screen.findByText("Tenants")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: /platform-wide crm activity per day/i }),
    ).toBeInTheDocument();

    expect(await screen.findByText("Gateway net held (30d)")).toBeInTheDocument();
    expect(screen.getByText("Rs. 100,000")).toBeInTheDocument();
    expect(screen.getByText("Needs review")).toBeInTheDocument();
  });

  it("shows quick-access shortcuts to the most-used admin pages", async () => {
    mswServer.use(
      http.get(OVERVIEW_URL, () => HttpResponse.json({ success: true, data: OVERVIEW })),
      http.get(TREND_URL, () => HttpResponse.json({ success: true, data: TREND })),
      http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, data: ROLLUP })),
    );

    renderPage();

    expect(await screen.findByText("Tenants")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "Brand applications" })).toHaveAttribute(
      "href",
      "/platform/brand-applications",
    );
    expect(screen.getByRole("link", { name: "Coupons" })).toHaveAttribute("href", "/coupons");
    expect(screen.getByRole("link", { name: "Withdrawal requests" })).toHaveAttribute(
      "href",
      "/withdraw-requests",
    );
    expect(screen.getByRole("link", { name: "Support requests" })).toHaveAttribute(
      "href",
      "/support",
    );
  });

  it("shows the chart empty state until the snapshot has enough history", async () => {
    mswServer.use(
      http.get(OVERVIEW_URL, () => HttpResponse.json({ success: true, data: OVERVIEW })),
      http.get(TREND_URL, () => HttpResponse.json({ success: true, data: [] })),
      http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, data: ROLLUP })),
    );

    renderPage();

    expect(
      await screen.findByText(/the daily snapshot builds this trend over time/i),
    ).toBeInTheDocument();
  });

  it("degrades the settlement section when the rollup is forbidden", async () => {
    mswServer.use(
      http.get(OVERVIEW_URL, () => HttpResponse.json({ success: true, data: OVERVIEW })),
      http.get(TREND_URL, () => HttpResponse.json({ success: true, data: TREND })),
      http.get(
        ROLLUP_URL,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Forbidden" }), {
            status: 403,
          }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Tenants")).toBeInTheDocument();
    expect(
      await screen.findByText(/settlement reconciliation is unavailable for your role/i),
    ).toBeInTheDocument();
  });

  it("surfaces an error banner when the overview totals fail to load", async () => {
    mswServer.use(
      http.get(
        OVERVIEW_URL,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Server error" }), {
            status: 500,
          }),
      ),
      http.get(TREND_URL, () => HttpResponse.json({ success: true, data: TREND })),
      http.get(ROLLUP_URL, () => HttpResponse.json({ success: true, data: ROLLUP })),
    );

    renderPage();

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });
});
