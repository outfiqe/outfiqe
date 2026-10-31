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
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { TagReviewMetricsPage } from "@/features/tag-reviews/components/TagReviewMetricsPage";

const API_BASE = "http://localhost:3000/api";

const baseMetrics = {
  overview: {
    tagsLive: { value: 8, previousValue: 4, deltaPercent: 100 },
    manualReviewRatePercent: { value: 75, previousValue: 50, deltaPercent: 50 },
    medianTimeToLiveHours: { value: 3, previousValue: 6, deltaPercent: -50 },
    approvedLast7d: { total: 8, manual: 6 },
    looksLiveLast7d: 6,
    openIssues: { count: 0, newLast7d: 0 },
  },
  reviewLatencyByPolicy: [
    { policy: "APPROVAL_REQUIRED", decidedCount: 6, p50Hours: 5.2, p90Hours: 41 },
  ],
  approvalSourceMix: [
    { source: "BRAND", count: 6 },
    { source: "SLA", count: 2 },
  ],
  rejectionReasonMix: [{ reason: "COUNTERFEIT_SUSPECTED", count: 3 }],
  timeToFirstShoppable: { looksWithApprovedTag: 12, p50Hours: 1.5, p90Hours: 30 },
  stuckApprovalRequiredCount: 0,
  waitingCount: 4,
  reports: { open: 0, last30Days: 5 },
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: TagReviewMetricsPage });
  const childRoutes = ["/tag-reviews/tags", "/tag-reports"].map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren(childRoutes),
    history: createMemoryHistory({ initialEntries: ["/tag-reviews"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const mockMetrics = (metrics: unknown) => {
  mswServer.use(
    http.get(`${API_BASE}/tag-reviews/metrics`, () =>
      HttpResponse.json({ success: true, message: "ok", data: metrics }),
    ),
  );
};

describe("TagReviewMetricsPage", () => {
  it("shows every number in plain words with its time period", async () => {
    mockMetrics(baseMetrics);
    renderPage();

    expect(await screen.findByText("Live tags")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Waiting for a brand")).toBeInTheDocument();
    expect(screen.getByText("Right now")).toBeInTheDocument();
    expect(screen.getByText("Checked by a brand")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days · 6 of 8 tags")).toBeInTheDocument();
    expect(screen.getByText("Typical time to go live")).toBeInTheDocument();
    expect(screen.getByText("3 hours")).toBeInTheDocument();
    expect(screen.getByText("↑ 100%")).toBeInTheDocument();
    expect(screen.getByText("↓ 50%")).toBeInTheDocument();
    expect(screen.queryByText(/p50|p90|SLA/)).not.toBeInTheDocument();
  });

  it("links each number to the tags behind it", async () => {
    mockMetrics({ ...baseMetrics, stuckApprovalRequiredCount: 2 });
    renderPage();

    const allTimeLink = await screen.findByRole("link", { name: "All time" });
    expect(allTimeLink.getAttribute("href")).toContain("view=LIVE");
    expect(screen.getByRole("link", { name: /Right now/ }).getAttribute("href")).toContain(
      "view=WAITING",
    );
    expect(screen.getByRole("link", { name: /Stuck tags/ }).getAttribute("href")).toContain(
      "view=STUCK",
    );
    expect(screen.getByRole("link", { name: /Looks like a fake/ }).getAttribute("href")).toContain(
      "reason=COUNTERFEIT_SUSPECTED",
    );
    expect(
      screen.getByRole("link", { name: /Checked by the brand/ }).getAttribute("href"),
    ).toContain("source=BRAND");
    expect(screen.getByRole("link", { name: /Open tag reports/ }).getAttribute("href")).toContain(
      "/tag-reports",
    );
  });

  it("does not offer a link for an approval source with no tags", async () => {
    mockMetrics(baseMetrics);
    renderPage();

    expect(await screen.findByText("Trusted muse")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Trusted muse/ })).not.toBeInTheDocument();
  });

  it("shows counts instead of a percent when too few tags were approved", async () => {
    mockMetrics({
      ...baseMetrics,
      overview: { ...baseMetrics.overview, approvedLast7d: { total: 3, manual: 3 } },
    });
    renderPage();

    expect(await screen.findByText("3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Last 7 days · too few to judge")).toBeInTheDocument();
    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });

  it("judges speed only when there is enough data", async () => {
    mockMetrics({
      ...baseMetrics,
      reviewLatencyByPolicy: [
        { policy: "APPROVAL_REQUIRED", decidedCount: 1, p50Hours: 0, p90Hours: 0 },
      ],
      timeToFirstShoppable: { looksWithApprovedTag: 9, p50Hours: 165.6, p90Hours: 300 },
    });
    renderPage();

    const brandRow = await screen.findByRole("link", { name: /Review every tag · 1 answer/ });
    expect(within(brandRow).getByText("Too few to judge")).toBeInTheDocument();
    const looksRow = screen.getByRole("link", { name: /9 looks with a live tag/ });
    expect(within(looksRow).getByText("Too slow")).toBeInTheDocument();
    expect(within(looksRow).getByText(/Usually 6.9 days/)).toBeInTheDocument();
  });

  it("warns in the banner when looks miss the target", async () => {
    mockMetrics({
      ...baseMetrics,
      timeToFirstShoppable: { looksWithApprovedTag: 9, p50Hours: 165.6, p90Hours: 300 },
    });
    renderPage();

    const banner = await screen.findByRole("alert");
    expect(within(banner).getByText(/too long to become shoppable/)).toBeInTheDocument();
    expect(within(banner).queryByText(/looks good/)).not.toBeInTheDocument();
  });

  it("shows friendly empty states", async () => {
    mockMetrics({
      ...baseMetrics,
      rejectionReasonMix: [],
      approvalSourceMix: [],
      reviewLatencyByPolicy: [],
      timeToFirstShoppable: { looksWithApprovedTag: 0, p50Hours: null, p90Hours: null },
    });
    renderPage();

    expect(await screen.findByText("No tags have been rejected yet.")).toBeInTheDocument();
    expect(screen.getByText(/No tags are live yet/)).toBeInTheDocument();
    expect(screen.getByText("No brand has answered a tag yet.")).toBeInTheDocument();
    expect(screen.getByText("No look has a live tag yet.")).toBeInTheDocument();
  });

  it("shows an error state when the request fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/tag-reviews/metrics`, () =>
        HttpResponse.json({ success: false, message: "nope" }, { status: 500 }),
      ),
    );
    renderPage();

    expect(await screen.findByText(/Couldn't load tag review metrics/)).toBeInTheDocument();
  });
});
