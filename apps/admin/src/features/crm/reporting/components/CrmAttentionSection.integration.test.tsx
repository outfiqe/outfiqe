import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { CrmAttentionSection } from "./CrmAttentionSection";

const API_BASE = "http://localhost:3000/api";

const mockAttention = (counts: Partial<Record<string, number>>) =>
  mswServer.use(
    http.get(`${API_BASE}/crm/reports/attention`, () =>
      HttpResponse.json({
        success: true,
        data: {
          overdueTaskCount: 0,
          tasksDueTodayCount: 0,
          unassignedTicketCount: 0,
          stuckDealCount: 0,
          ...counts,
        },
      }),
    ),
  );

describe("CrmAttentionSection", () => {
  it("links each waiting item to the matching filtered list", async () => {
    mockAttention({ overdueTaskCount: 2, unassignedTicketCount: 1, stuckDealCount: 3 });
    renderWithRouter(<CrmAttentionSection />);

    const overdueLink = await screen.findByRole("link", { name: /2 overdue tasks/ });
    expect(overdueLink.getAttribute("href")).toContain("due=overdue");
    const ticketLink = screen.getByRole("link", { name: /1 ticket with no one on it/ });
    expect(ticketLink.getAttribute("href")).toContain("assignee=none");
    expect(ticketLink.getAttribute("href")).toContain("status=ACTIVE");
    const dealLink = screen.getByRole("link", { name: /3 opportunities not moving/ });
    expect(dealLink.getAttribute("href")).toContain("stuck=yes");
  });

  it("leaves out anything with nothing waiting", async () => {
    mockAttention({ tasksDueTodayCount: 1 });
    renderWithRouter(<CrmAttentionSection />);

    expect(await screen.findByRole("link", { name: /1 task due today/ })).toBeInTheDocument();
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();
  });

  it("says so when nothing needs attention", async () => {
    mockAttention({});
    renderWithRouter(<CrmAttentionSection />);

    expect(
      await screen.findByText("Nothing needs attention today. Nice work."),
    ).toBeInTheDocument();
  });

  it("explains when the list can't be loaded", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/reports/attention`, () =>
        HttpResponse.json({ success: false, message: "Failed." }, { status: 500 }),
      ),
    );
    renderWithRouter(<CrmAttentionSection />);

    expect(await screen.findByText("This list is unavailable right now.")).toBeInTheDocument();
  });
});
