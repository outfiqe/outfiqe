import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { CrmOverviewSection } from "./CrmOverviewSection";

const API_BASE = "http://localhost:3000/api";
const OVERVIEW_URL = `${API_BASE}/crm/reports/overview`;

const buildStage = (overrides: Record<string, unknown>) => ({
  stageId: "s1",
  stageName: "Lead",
  sortOrder: 0,
  isWon: false,
  isLost: false,
  openDealCount: 0,
  openValue: 0,
  wonDealCount: 0,
  wonValue: 0,
  lostDealCount: 0,
  ...overrides,
});

const buildOverview = (overrides: Record<string, unknown> = {}) => ({
  pipeline: {
    stages: [buildStage({ stageId: "s1", stageName: "Lead", openDealCount: 3, openValue: 8500 })],
    totals: {
      openDealCount: 3,
      openValue: 9000,
      wonDealCount: 1,
      wonValue: 20000,
      lostDealCount: 0,
    },
  },
  tickets: {
    statusCounts: [{ status: "OPEN", count: 2 }],
    openCount: 2,
    resolvedCount: 4,
    meanResolutionSeconds: 2 * 60 * 60,
  },
  openTasksDueTodayCount: 5,
  activityTrend: Array.from({ length: 30 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    count: index === 29 ? 6 : 0,
  })),
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("CrmOverviewSection", () => {
  it("renders the KPI row and both chart cards from the overview report", async () => {
    mswServer.use(
      http.get(OVERVIEW_URL, () => HttpResponse.json({ success: true, data: buildOverview() })),
    );

    render(<CrmOverviewSection />, { wrapper });

    expect(await screen.findByText("Open pipeline")).toBeInTheDocument();
    expect(screen.getByText("Rs. 9,000")).toBeInTheDocument();
    expect(screen.getByText("Tasks due today")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: /crm activities logged per day/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: /open deal value by pipeline stage/i }),
    ).toBeInTheDocument();
  });

  it("shows the empty states when the organization has no activity or pipeline value", async () => {
    mswServer.use(
      http.get(OVERVIEW_URL, () =>
        HttpResponse.json({
          success: true,
          data: buildOverview({
            pipeline: {
              stages: [buildStage({})],
              totals: {
                openDealCount: 0,
                openValue: 0,
                wonDealCount: 0,
                wonValue: 0,
                lostDealCount: 0,
              },
            },
            activityTrend: Array.from({ length: 30 }, (_, index) => ({
              date: `2026-08-${String(index + 1).padStart(2, "0")}`,
              count: 0,
            })),
          }),
        }),
      ),
    );

    render(<CrmOverviewSection />, { wrapper });

    expect(
      await screen.findByText(/logged calls, notes and emails will show here/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/add deals to the pipeline to see value by stage/i),
    ).toBeInTheDocument();
  });

  it("surfaces an error banner when the report fails to load", async () => {
    mswServer.use(
      http.get(
        OVERVIEW_URL,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Server error" }), {
            status: 500,
          }),
      ),
    );

    render(<CrmOverviewSection />, { wrapper });

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });
});
