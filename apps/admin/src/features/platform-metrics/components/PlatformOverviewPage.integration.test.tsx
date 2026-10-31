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
import { describe, expect, it, vi } from "vitest";

import { PlatformOverviewPage } from "./PlatformOverviewPage";

vi.mock("@/features/auth/components/AuthContext", () => ({
  useAuth: () => ({
    state: {
      status: "signed-in",
      user: { hasPlatformAccess: true, isCoFounder: false, hiddenPlatformNavKeys: [] },
    },
  }),
}));

const API_BASE = "http://localhost:3000/api";
const OVERVIEW_URL = `${API_BASE}/platform/metrics/overview`;
const TREND_URL = `${API_BASE}/platform/metrics/activity-trend`;
const ATTENTION_URL = `${API_BASE}/platform/metrics/attention`;
const MONEY_URL = `${API_BASE}/admin/financial-rollup/money-breakdown`;

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

const ATTENTION = {
  ordersToPack: 3,
  productsToReview: 0,
  brandApplications: 2,
  refundsWaiting: 1,
  withdrawalRequests: 0,
  supportRequests: 4,
};

const MONEY = {
  range: "30d",
  collected: 100_000,
  refunded: 10_000,
  held: 90_000,
  brandsOwed: 45_000,
  brandsPaid: 30_000,
  musesOwed: 1_000,
  musesPaid: 500,
  gatewayFees: 200,
  platformKeeps: 3_300,
  orderFees: 5_000,
  cancelledNotRefunded: 5_000,
  couponSpend: 0,
  unexplained: 0,
};

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });
const failure = (status: number) =>
  new HttpResponse(JSON.stringify({ success: false, message: "Nope" }), { status });

const mockApis = ({
  money = MONEY,
  trend = TREND,
}: { money?: typeof MONEY; trend?: typeof TREND } = {}) => {
  mswServer.use(
    http.get(OVERVIEW_URL, () => okJson(OVERVIEW)),
    http.get(TREND_URL, () => okJson(trend)),
    http.get(ATTENTION_URL, () => okJson(ATTENTION)),
    http.get(MONEY_URL, () => okJson(money)),
  );
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
  it("shows a skeleton with the same sections as the loaded page while the overview loads", async () => {
    mockApis();
    mswServer.use(http.get(OVERVIEW_URL, () => new Promise<Response>(() => {})));

    renderPage();

    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Needs action" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
    expect(screen.queryByText("Tenants")).not.toBeInTheDocument();
  });

  it("links each total to the list of organizations", async () => {
    mockApis();
    renderPage();

    expect(await screen.findByText("Tenants")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How Tenants is calculated" })).toBeInTheDocument();
    const organizationLinks = screen.getAllByRole("link", { name: "By organization" });
    expect(organizationLinks).toHaveLength(6);
    expect(organizationLinks[0]).toHaveAttribute("href", "/platform/metrics");
    expect(
      screen.getByRole("figure", { name: /platform-wide crm activity per day/i }),
    ).toBeInTheDocument();
  });

  it("says how much work is waiting on each shortcut", async () => {
    mockApis();
    renderPage();

    const ordersLink = await screen.findByRole("link", { name: /Orders/ });
    expect(ordersLink).toHaveAttribute("href", "/orders?status=PLACED");
    expect(await screen.findByText("3 to pack")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Products/ })).toHaveTextContent("All clear");
    expect(screen.getByRole("link", { name: /Refunds/ })).toHaveAttribute(
      "href",
      "/orders/refunds",
    );
  });

  it("keeps the shortcuts working when the counts can't load", async () => {
    mockApis();
    mswServer.use(http.get(ATTENTION_URL, () => failure(403)));
    renderPage();

    expect(await screen.findByRole("link", { name: /Orders/ })).toHaveTextContent("Open");
  });

  it("traces the money and says it adds up", async () => {
    mockApis();
    renderPage();

    expect(await screen.findByText("Everything adds up.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Still owed to brands/ })).toHaveTextContent(
      "Rs. 45,000",
    );
    expect(screen.getByRole("link", { name: /Paid to brands/ }).getAttribute("href")).toContain(
      "payout=WITHDRAWN",
    );
    expect(screen.getByText("Platform keeps")).toBeInTheDocument();
    expect(screen.queryByText("Not traced")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs review")).not.toBeInTheDocument();
  });

  it("warns only about money that can't be traced", async () => {
    mockApis({ money: { ...MONEY, unexplained: 5_000 } });
    renderPage();

    expect(await screen.findByText("Rs. 5,000 can't be traced.")).toBeInTheDocument();
    expect(screen.getByText("Not traced")).toBeInTheDocument();
  });

  it("doesn't raise an alarm over a rounding difference", async () => {
    mockApis({ money: { ...MONEY, unexplained: 10 } });
    renderPage();

    expect(await screen.findByText("Everything adds up.")).toBeInTheDocument();
    expect(screen.getByText("Not traced")).toBeInTheDocument();
  });

  it("shows the chart empty state until the snapshot has enough history", async () => {
    mockApis({ trend: [] });
    renderPage();

    expect(await screen.findByText(/This fills in as days pass/)).toBeInTheDocument();
  });

  it("explains itself when the money section is forbidden", async () => {
    mockApis();
    mswServer.use(http.get(MONEY_URL, () => failure(403)));
    renderPage();

    expect(await screen.findByText("Tenants")).toBeInTheDocument();
    expect(await screen.findByText(/isn't available for your role/)).toBeInTheDocument();
  });

  it("surfaces an error banner when the overview totals fail to load", async () => {
    mockApis();
    mswServer.use(http.get(OVERVIEW_URL, () => failure(500)));
    renderPage();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
