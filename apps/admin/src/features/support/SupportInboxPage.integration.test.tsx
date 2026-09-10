import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { SupportInboxPage } from "./SupportInboxPage";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ state: { status: "signed-in", user: { id: "agent-1" } } }),
}));

const API_BASE = "http://localhost:3000/api/support/admin";

const stubInbox = () => {
  const inboxQueries: URLSearchParams[] = [];
  mswServer.use(
    http.get(`${API_BASE}/tickets`, ({ request }) => {
      inboxQueries.push(new URL(request.url).searchParams);
      return HttpResponse.json({ success: true, data: { tickets: [], nextCursor: null } });
    }),
    http.get(`${API_BASE}/stats`, () =>
      HttpResponse.json({
        success: true,
        data: { open: 0, unassigned: 0, awaitingUs: 0, oldestWaitingAgeHours: null },
      }),
    ),
    http.get(`${API_BASE}/agents`, () => HttpResponse.json({ success: true, data: [] })),
  );
  return inboxQueries;
};

const lastQuery = (queries: URLSearchParams[]) => queries[queries.length - 1];

describe("SupportInboxPage", () => {
  it("applies the assignee, status and category filters from the URL", async () => {
    const inboxQueries = stubInbox();
    renderWithRouter(<SupportInboxPage />, {
      path: "/support",
      initialEntry: "/support?assignee=unassigned&status=OPEN&category=PAYMENT",
    });

    await screen.findByText("Support requests");
    await waitFor(() => {
      const query = lastQuery(inboxQueries);
      expect(query.get("status")).toBe("OPEN");
      expect(query.get("category")).toBe("PAYMENT");
      expect(query.get("unassigned")).toBe("true");
    });
  });

  it("writes a picked status filter into the URL and refetches", async () => {
    const inboxQueries = stubInbox();
    const user = userEvent.setup();
    const { router } = renderWithRouter(<SupportInboxPage />, { path: "/support" });

    await screen.findByText("Support requests");
    await user.selectOptions(screen.getByLabelText("Filter by status"), "OPEN");

    await waitFor(() => expect(router.state.location.search).toMatchObject({ status: "OPEN" }));
    await waitFor(() => expect(lastQuery(inboxQueries).get("status")).toBe("OPEN"));
  });

  it("drops the assignee param again when All assignees is reselected", async () => {
    stubInbox();
    const user = userEvent.setup();
    const { router } = renderWithRouter(<SupportInboxPage />, {
      path: "/support",
      initialEntry: "/support?assignee=me",
    });

    await screen.findByText("Support requests");
    await user.selectOptions(screen.getByLabelText("Filter by assignee"), "all");

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });
});
