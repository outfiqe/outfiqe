import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ReportPeriodSummary } from "./ReportPeriodSummary";

const API_BASE = "http://localhost:3000/api";

const SUMMARY = {
  sales: { newDealCount: 4, wonDealCount: 3, wonValue: 9000, lostDealCount: 1 },
  support: { openedCount: 6, resolvedCount: 5, meanResolutionSeconds: 7200 },
  team: [
    {
      membershipId: "m-1",
      name: "Bipin Karki",
      wonDealCount: 3,
      wonValue: 9000,
      resolvedTicketCount: 5,
      completedTaskCount: 2,
      activityCount: 8,
    },
  ],
};

const mockSummary = (seenQueries: URLSearchParams[] = []) =>
  mswServer.use(
    http.get(`${API_BASE}/crm/reports/summary`, ({ request }) => {
      seenQueries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ success: true, data: SUMMARY });
    }),
  );

describe("ReportPeriodSummary", () => {
  it("shows sales, support and team numbers in plain words", async () => {
    mockSummary();
    renderWithRouter(<ReportPeriodSummary />);

    expect(await screen.findByText("75%")).toBeInTheDocument();
    expect(screen.getByText("Bipin Karki")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See these tickets" })).toBeInTheDocument();
  });

  it("keeps the chosen period in the link and asks the API for it", async () => {
    const seenQueries: URLSearchParams[] = [];
    mockSummary(seenQueries);
    const { router } = renderWithRouter(<ReportPeriodSummary />);
    const user = userEvent.setup({ delay: null });

    await screen.findByText("75%");
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));

    await waitFor(() => expect(router.state.location.search).toMatchObject({ range: "7d" }));
    await waitFor(() => expect(seenQueries.length).toBeGreaterThan(1));
  });

  it("waits for both dates on a custom period", async () => {
    const seenQueries: URLSearchParams[] = [];
    mockSummary(seenQueries);
    renderWithRouter(<ReportPeriodSummary />, { initialEntry: "/?range=custom" });

    expect(
      await screen.findByText("Pick a start and end date to see this report."),
    ).toBeInTheDocument();
    expect(seenQueries).toHaveLength(0);
  });

  it("opens a custom period straight from the link", async () => {
    const seenQueries: URLSearchParams[] = [];
    mockSummary(seenQueries);
    renderWithRouter(<ReportPeriodSummary />, {
      initialEntry: "/?range=custom&from=2026-08-01&to=2026-08-31",
    });

    await screen.findByText("75%");
    expect(seenQueries.at(-1)?.get("from")).toBe(new Date(2026, 7, 1).toISOString());
  });
});
