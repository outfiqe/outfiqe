import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TagReviewMetricsPage } from "@/features/tag-reviews/TagReviewMetricsPage";

const API_BASE = "http://localhost:3000/api";

const metrics = {
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

describe("TagReviewMetricsPage", () => {
  it("renders the funnel numbers from the API", async () => {
    mswServer.use(
      http.get(`${API_BASE}/tag-reviews/metrics`, () =>
        HttpResponse.json({ success: true, message: "ok", data: metrics }),
      ),
    );
    renderPage();

    expect(await screen.findByText(/Review every tag \(6\)/)).toBeInTheDocument();
    expect(screen.getByText("p50 5.2h · p90 41h")).toBeInTheDocument();
    expect(screen.getByText("Brand approved")).toBeInTheDocument();
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
});
