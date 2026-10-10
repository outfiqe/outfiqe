import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { ReportsSection } from "./ReportsSection";

const API_BASE = "http://localhost:3000/api";

const EMPTY_PIPELINE = {
  stages: [
    {
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
    },
  ],
  totals: { openDealCount: 0, openValue: 0, wonDealCount: 0, wonValue: 0, lostDealCount: 0 },
};

const EMPTY_TICKETS = {
  statusCounts: [],
  openCount: 0,
  resolvedCount: 0,
  meanResolutionSeconds: null,
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("ReportsSection", () => {
  it("renders the pipeline bars, ticket tiles and a formatted mean resolution time", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/reports/pipeline`, () =>
        HttpResponse.json({
          success: true,
          data: {
            stages: [
              {
                stageId: "s1",
                stageName: "Lead",
                sortOrder: 0,
                isWon: false,
                isLost: false,
                openDealCount: 2,
                openValue: 3000,
                wonDealCount: 0,
                wonValue: 0,
                lostDealCount: 0,
              },
              {
                stageId: "s2",
                stageName: "Won",
                sortOrder: 1,
                isWon: true,
                isLost: false,
                openDealCount: 0,
                openValue: 0,
                wonDealCount: 1,
                wonValue: 5000,
                lostDealCount: 0,
              },
            ],
            totals: {
              openDealCount: 2,
              openValue: 3000,
              wonDealCount: 1,
              wonValue: 5000,
              lostDealCount: 1,
            },
          },
        }),
      ),
      http.get(`${API_BASE}/crm/reports/tickets`, () =>
        HttpResponse.json({
          success: true,
          data: {
            statusCounts: [
              { status: "OPEN", count: 3 },
              { status: "RESOLVED", count: 1 },
            ],
            openCount: 3,
            resolvedCount: 1,
            meanResolutionSeconds: 2 * 60 * 60 + 15 * 60,
          },
        }),
      ),
    );

    render(<ReportsSection />, { wrapper });

    expect(await screen.findByText("Pipeline value by stage")).toBeInTheDocument();
    expect(await screen.findByText("Rs. 5,000")).toBeInTheDocument();
    expect(screen.getAllByText("Rs. 3,000").length).toBeGreaterThan(0);
    expect(screen.getByText("Lead")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(await screen.findByText("2h 15m")).toBeInTheDocument();
  });

  it("shows a 'not enough data yet' state when there is nothing to report", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/reports/pipeline`, () =>
        HttpResponse.json({ success: true, data: EMPTY_PIPELINE }),
      ),
      http.get(`${API_BASE}/crm/reports/tickets`, () =>
        HttpResponse.json({ success: true, data: EMPTY_TICKETS }),
      ),
    );

    render(<ReportsSection />, { wrapper });

    expect(
      await screen.findByText(/add deals to the pipeline to see value by stage/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/no support tickets have been opened/i)).toBeInTheDocument();
  });

  it("surfaces an error banner when a report fails to load", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/crm/reports/pipeline`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Server error" }), {
            status: 500,
          }),
      ),
      http.get(`${API_BASE}/crm/reports/tickets`, () =>
        HttpResponse.json({ success: true, data: EMPTY_TICKETS }),
      ),
    );

    render(<ReportsSection />, { wrapper });

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });
});
