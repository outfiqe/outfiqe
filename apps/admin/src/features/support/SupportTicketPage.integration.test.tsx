import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { SupportTicketPage } from "./SupportTicketPage";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ state: { status: "signed-in", user: { id: "staff-1" } } }),
}));

const API_BASE = "http://localhost:3000/api";

const ticket = (overrides: Record<string, unknown> = {}) => ({
  id: "t-1",
  reference: "OFQ-7",
  ticketNumber: 7,
  requesterUserId: "cust-1",
  requesterEmail: "cust@outfiqe.test",
  requesterName: " Camila",
  segment: "SHOPPER",
  category: "ORDER_ISSUE",
  subject: "Order never arrived",
  status: "OPEN",
  priority: "NORMAL",
  assigneeUserId: null,
  assigneeName: null,
  relatedOrderId: null,
  relatedBrandId: null,
  relatedBrandName: null,
  firstRespondedAt: null,
  resolvedAt: null,
  lastCustomerAt: "2026-09-01T00:00:00.000Z",
  messageCount: 1,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  messages: [
    {
      id: "m-1",
      ticketId: "t-1",
      authorKind: "REQUESTER",
      authorUserId: "cust-1",
      authorName: "Camila",
      visibility: "PUBLIC",
      body: "Nothing showed up.",
      attachmentUrls: [],
      createdAt: "2026-09-01T00:00:00.000Z",
    },
  ],
  ...overrides,
});

const renderTicket = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const ticketRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/support/$ticketId",
    component: SupportTicketPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/support" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([ticketRoute, listRoute]),
    history: createMemoryHistory({ initialEntries: ["/_authenticated/support/t-1"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("SupportTicketPage", () => {
  it("only offers legal status transitions and posts the expected status", async () => {
    let statusBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/support/admin/tickets/t-1`, () =>
        HttpResponse.json({ success: true, data: ticket() }),
      ),
      http.get(`${API_BASE}/support/admin/agents`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.patch(`${API_BASE}/support/admin/tickets/t-1/status`, async ({ request }) => {
        statusBody = await request.json();
        return HttpResponse.json({ success: true, data: ticket({ status: "RESOLVED" }) });
      }),
    );

    renderTicket();

    expect(await screen.findByRole("heading", { name: "Order never arrived" })).toBeInTheDocument();
    // OPEN -> WAITING_ON_CUSTOMER / RESOLVED are the only legal moves
    expect(screen.queryByRole("button", { name: "Closed" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resolved" }));

    await waitFor(() => expect(statusBody).toEqual({ status: "RESOLVED", expectedStatus: "OPEN" }));
  });

  it("sends an internal note without the customer-visible toggle", async () => {
    let replyBody: Record<string, unknown> | undefined;
    mswServer.use(
      http.get(`${API_BASE}/support/admin/tickets/t-1`, () =>
        HttpResponse.json({ success: true, data: ticket() }),
      ),
      http.get(`${API_BASE}/support/admin/agents`, () =>
        HttpResponse.json({ success: true, data: [] }),
      ),
      http.post(`${API_BASE}/support/admin/tickets/t-1/messages`, async ({ request }) => {
        replyBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ success: true, data: ticket() });
      }),
    );

    renderTicket();

    await screen.findByRole("heading", { name: "Order never arrived" });
    await userEvent.click(screen.getByRole("button", { name: "Internal note" }));
    await userEvent.type(screen.getByRole("textbox"), "checked with the courier");
    await userEvent.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() => expect(replyBody?.visibility).toBe("INTERNAL"));
    expect(replyBody?.moveToWaitingOnCustomer).toBe(false);
  });
});
