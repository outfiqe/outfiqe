import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TagReviewMetricsPage } from "@/features/tag-reviews/TagReviewMetricsPage";

const API_BASE = "http://localhost:3000/api";

const noTrend = { value: null, previousValue: null, deltaPercent: null };

const baseMetrics = {
  overview: {
    tagsLive: { value: 8, previousValue: 4, deltaPercent: 100 },
    manualReviewRatePercent: { value: 75, previousValue: 50, deltaPercent: 50 },
    medianTimeToLiveHours: { value: 3, previousValue: 6, deltaPercent: -50 },
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
  stuckApprovalRequiredCount: 4,
  reports: { open: 2, last30Days: 5 },
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<TagReviewMetricsPage />, { wrapper });
};

const mockMetrics = (data: unknown) => {
  mswServer.use(
    http.get(`${API_BASE}/tag-reviews/metrics`, () =>
      HttpResponse.json({ success: true, message: "ok", data }),
    ),
  );
};

describe("TagReviewMetricsPage", () => {
  it("renders the funnel numbers from the API", async () => {
    mockMetrics(baseMetrics);
    renderPage();

    expect(await screen.findByText(/Review every tag \(6\)/)).toBeInTheDocument();
    expect(screen.getByText(/p50 5.2h · p90 41h/)).toBeInTheDocument();
    expect(screen.getByText("Counterfeit suspected")).toBeInTheDocument();
    expect(screen.getByText("Stuck > 7d under Review-every-tag")).toBeInTheDocument();
    expect(screen.getByText("Open tag reports")).toBeInTheDocument();
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

  it("shows the overview strip with headline numbers, plain-language subtext, and trend", async () => {
    mockMetrics(baseMetrics);
    renderPage();

    expect(await screen.findByText("Tags live")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Manual review rate")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Median time to live")).toBeInTheDocument();
    expect(screen.getByText("3h")).toBeInTheDocument();
    expect(screen.getByText("Open issues")).toBeInTheDocument();

    expect(screen.getByText("↑ 100%")).toBeInTheDocument();
    expect(screen.getByText("↓ 50%")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "How Tags live is calculated" })).toBeInTheDocument();
  });

  it("shows an all-clear insight banner when there are no open issues and manual review has happened", async () => {
    mockMetrics(baseMetrics);
    renderPage();

    expect(await screen.findByText(/Funnel looks healthy/)).toBeInTheDocument();
  });

  it("surfaces open issues as the most important insight, ahead of everything else", async () => {
    mockMetrics({
      ...baseMetrics,
      overview: {
        ...baseMetrics.overview,
        openIssues: { count: 3, newLast7d: 2 },
      },
    });
    renderPage();

    expect(await screen.findByText(/3 issues need attention/)).toBeInTheDocument();
    expect(screen.getByText(/2 of these are new in the last 7 days/)).toBeInTheDocument();
  });

  it("calls out zero manual review as the key insight when nothing else needs attention", async () => {
    mockMetrics({
      ...baseMetrics,
      overview: {
        ...baseMetrics.overview,
        manualReviewRatePercent: { value: 0, previousValue: 0, deltaPercent: null },
        openIssues: { count: 0, newLast7d: 0 },
      },
    });
    renderPage();

    expect(
      await screen.findByText(/0 tags have gone through manual review yet/),
    ).toBeInTheDocument();
  });

  it("labels legacy approvals as Legacy approval, not Grandfathered, with an explanatory tooltip", async () => {
    mockMetrics({
      ...baseMetrics,
      approvalSourceMix: [
        { source: "BRAND", count: 6 },
        { source: "GRANDFATHERED", count: 4 },
      ],
    });
    renderPage();

    expect(await screen.findAllByText("Legacy approval")).not.toHaveLength(0);
    expect(screen.queryByText("Grandfathered")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "What does Legacy approval mean?" }),
    ).toBeInTheDocument();
  });

  it("shows plain-language empty-state guidance instead of a bare no-data message", async () => {
    mockMetrics({ ...baseMetrics, rejectionReasonMix: [] });
    renderPage();

    expect(await screen.findByText(/No rejections yet — expected pre-launch/)).toBeInTheDocument();
  });

  it("shows 'not enough history yet' instead of a broken percentage when a trend has no prior data", async () => {
    mockMetrics({
      ...baseMetrics,
      overview: {
        tagsLive: { value: 0, previousValue: 0, deltaPercent: null },
        manualReviewRatePercent: noTrend,
        medianTimeToLiveHours: noTrend,
        openIssues: { count: 0, newLast7d: 0 },
      },
    });
    renderPage();

    expect(await screen.findAllByText("Not enough history yet")).not.toHaveLength(0);
  });
});
