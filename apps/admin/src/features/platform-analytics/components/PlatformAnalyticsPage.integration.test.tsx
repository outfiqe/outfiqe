import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformAnalyticsPage } from "./PlatformAnalyticsPage";

const API_BASE = "http://localhost:3000/api";
const ANALYTICS_BASE = `${API_BASE}/platform/analytics`;
const ROLLUP_URL = `${API_BASE}/admin/financial-rollup`;
const POSTHOG_URL = "https://us.posthog.com/project/550784/web";

const fresh = (insight: unknown) => ({
  status: "fresh",
  refreshedAt: "2026-10-30T10:00:00.000Z",
  posthogUrl: POSTHOG_URL,
  insight,
});

const INSIGHTS: Record<string, ReturnType<typeof fresh>> = {
  overview: fresh({ visitors: 1200, signups: 85, buyers: 48, orders: 60, visitToBuyerRate: 0.04 }),
  "funnels/purchase": fresh({
    steps: [
      { event: "product:detail_view", persons: 800 },
      { event: "cart:item_add", persons: 200 },
      { event: "checkout:checkout_start", persons: 90 },
      { event: "checkout:order_submit", persons: 60 },
      { event: "checkout:order_place", persons: 48 },
    ],
    ordersByPaymentMethod: [
      { paymentMethod: "cod", orders: 40 },
      { paymentMethod: "esewa", orders: 20 },
    ],
  }),
  "funnels/look-to-order": fresh({
    steps: [{ event: "look:detail_view", persons: 0 }],
    attributedOrders: 0,
    topCreatorsByLookViews: [],
  }),
  acquisition: fresh({
    sources: [
      { source: "instagram.com", visitors: 300 },
      { source: "$direct", visitors: 120 },
    ],
    campaigns: [],
    creatorLinkClicks: 14,
  }),
  retention: fresh({
    weeklyActiveVisitors: [],
    buyers: 48,
    repeatBuyers: 12,
    repeatPurchaseRate: 0.25,
  }),
  "search/zero-results": fresh({ searches: [{ query: "velvet saree", searchCount: 9 }] }),
  traffic: fresh({
    pageViews: 3400,
    sessions: 950,
    averageSessionSeconds: 221,
    bounceRate: 0.32,
    topPages: [
      { path: "/", productName: null, count: 1800 },
      { path: "/product/1", productName: "Linen kurta", count: 240 },
    ],
    entryPages: [{ path: "/explore", productName: null, count: 310 }],
    exitPages: [],
  }),
  speed: fresh({
    measurementCount: 190,
    largestContentfulPaintMs: 5330,
    interactionToNextPaintMs: 78,
    firstContentfulPaintMs: 2000,
    cumulativeLayoutShift: 0.08,
  }),
};

const ROLLUP = {
  range: "30d",
  gateway: { grossCollected: 100000, refunded: 0, netHeld: 100000 },
  ledger: {
    owedToBrands: 45000,
    owedToCreators: 15000,
    brandPayoutsByStatus: {},
    creatorCommissionsByStatus: {},
    platformRevenueRealized: 0,
  },
  byPaymentMethod: {
    COD: { gmv: 150000, orderCount: 40, realizedTakeRate: 0.1 },
    ESEWA: { gmv: 90000, orderCount: 20, realizedTakeRate: 0.1 },
  },
  attribution: { totalItems: 80, attributedItems: 20, attributedShare: 0.25 },
};

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const serveInsights = (
  insightFor: (insightPath: string) => unknown = (insightPath) => INSIGHTS[insightPath],
  seenRanges: string[] = [],
) =>
  mswServer.use(
    ...Object.keys(INSIGHTS).map((insightPath) =>
      http.get(`${ANALYTICS_BASE}/${insightPath}`, ({ request }) => {
        seenRanges.push(new URL(request.url).searchParams.get("range") ?? "");
        return ok(insightFor(insightPath));
      }),
    ),
  );

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: PlatformAnalyticsPage });
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

describe("PlatformAnalyticsPage", () => {
  it("shows every section with PostHog numbers and exact order totals", async () => {
    serveInsights();
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));

    renderPage();

    expect(await screen.findByText("1,200")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Product analytics" })).toBeInTheDocument();
    expect(await screen.findByText("Rs. 240,000")).toBeInTheDocument();
    expect(await screen.findByText("Cash on delivery")).toBeInTheDocument();
    expect(screen.getByText("Started checkout")).toBeInTheDocument();
    expect(screen.getByText("Direct or unknown")).toBeInTheDocument();
    expect(screen.getByText("velvet saree")).toBeInTheDocument();
    expect(screen.getByText("Nobody has opened a look in this range yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open in posthog/i })[0]).toHaveAttribute(
      "href",
      POSTHOG_URL,
    );
  });

  it("shows site traffic, with product pages by name and an empty list explained", async () => {
    serveInsights();
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));

    renderPage();

    expect(await screen.findByText("3,400")).toBeInTheDocument();
    expect(screen.getByText("3m 41s")).toBeInTheDocument();
    expect(screen.getByText("32.0%")).toBeInTheDocument();
    expect(screen.getByText("Linen kurta")).toBeInTheDocument();
    expect(screen.getByText("/explore")).toBeInTheDocument();
    expect(screen.getByText("No page views in this range yet.")).toBeInTheDocument();
  });

  it("rates site speed in words, so it doesn't rely on colour", async () => {
    serveInsights();
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));

    renderPage();

    expect(await screen.findByText("5.33 s")).toBeInTheDocument();
    expect(screen.getByText("Poor")).toBeInTheDocument();
    expect(screen.getByText("Needs work")).toBeInTheDocument();
    expect(screen.getAllByText("Good")).toHaveLength(2);
    expect(screen.getByText("Based on 190 measurements.")).toBeInTheDocument();
  });

  it("says so when no speed has been measured yet", async () => {
    serveInsights((insightPath) =>
      insightPath === "speed"
        ? fresh({
            measurementCount: 0,
            largestContentfulPaintMs: null,
            interactionToNextPaintMs: null,
            firstContentfulPaintMs: null,
            cumulativeLayoutShift: null,
          })
        : INSIGHTS[insightPath],
    );
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));

    renderPage();

    expect(await screen.findByText("No speed measurements in this range yet.")).toBeInTheDocument();
  });

  it("explains how to connect PostHog when the read-only key isn't set", async () => {
    serveInsights(() => ({
      status: "not_connected",
      refreshedAt: null,
      posthogUrl: null,
      insight: null,
    }));
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));

    renderPage();

    await waitFor(() =>
      expect(screen.getAllByText(/analytics isn't connected yet/i)).toHaveLength(
        Object.keys(INSIGHTS).length,
      ),
    );
    expect(screen.queryByRole("link", { name: /open in posthog/i })).not.toBeInTheDocument();
  });

  it("marks numbers as saved copies when PostHog didn't answer", async () => {
    serveInsights((insightPath) => ({
      ...INSIGHTS[insightPath],
      status: "stale",
    }));
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));

    renderPage();

    expect((await screen.findAllByText(/shows the last saved numbers/i)).length).toBeGreaterThan(0);
  });

  it("keeps the PostHog sections working for a role without the finance permission", async () => {
    serveInsights();
    mswServer.use(
      http.get(ROLLUP_URL, () =>
        HttpResponse.json({ success: false, message: "Forbidden" }, { status: 403 }),
      ),
    );

    renderPage();

    expect(await screen.findByText(/need the finance permission/i)).toBeInTheDocument();
    expect(await screen.findByText("1,200")).toBeInTheDocument();
  });

  it("asks for the chosen date range", async () => {
    const seenRanges: string[] = [];
    serveInsights(undefined, seenRanges);
    mswServer.use(http.get(ROLLUP_URL, () => ok(ROLLUP)));
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("1,200");
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));

    await waitFor(() => expect(seenRanges).toContain("7d"));
    expect(seenRanges).toContain("30d");
  });
});
