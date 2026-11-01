import { Toaster } from "@outfiqe/design-system";
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

import { TicketsPage } from "./TicketsPage";

const API_BASE = "http://localhost:3000/api";

const TICKET = {
  id: "tk-1",
  organizationId: "o-1",
  type: "COMPLAINT",
  status: "OPEN",
  title: "Damaged package",
  description: "Arrived torn",
  partnerCreatorId: null,
  customerUserId: "c-1",
  assigneeMembershipId: null,
  assigneeName: null,
  createdByMembershipId: "mem-1",
  resolvedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

const mockCommon = (
  overrides: { viewerIsSuperAdmin?: boolean; viewerPermissionKeys?: string[] } = {},
) => {
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({
        success: true,
        data: {
          id: "o-1",
          name: "Meridian",
          plan: "trial",
          trialEndsAt: null,
          linkedBrandId: "brand-1",
          superAdminMembershipId: "m-1",
          viewerIsSuperAdmin: overrides.viewerIsSuperAdmin ?? true,
          viewerPermissionKeys: overrides.viewerPermissionKeys ?? [],
          pendingOwnershipTransfer: null,
          advancedFeaturesEnabled: true,
        },
      }),
    ),
    http.get(`${API_BASE}/crm/members`, () =>
      HttpResponse.json({
        success: true,
        data: [
          {
            id: "mem-1",
            userId: "u-1",
            userName: "Bipin Karki",
            userEmail: "b@x.test",
            roleId: "r-1",
            roleName: "Admin",
            status: "ACTIVE",
            isSuperAdmin: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    ),
    http.get(`${API_BASE}/crm/tickets`, () =>
      HttpResponse.json({ success: true, data: { tickets: [TICKET], nextCursor: null } }),
    ),
  );
};

const renderTicketsPage = (initialEntry = "/crm/support") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    validateSearch: (search: Record<string, unknown>) => search,
    component: TicketsPage,
  });
  const children = [
    "/crm",
    "/crm/partners",
    "/crm/customers",
    "/crm/pipeline",
    "/crm/tasks",
    "/crm/support",
    "/crm/reports",
    "/crm/roles",
    "/crm/audit",
    "/crm/billing",
  ].map((path) => createRoute({ getParentRoute: () => rootRoute, path }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return router;
};

describe("TicketsPage", () => {
  it("lists tickets and links each one to its own page", async () => {
    mockCommon();
    renderTicketsPage();

    expect(
      await screen.findByText(/problems and requests from your customers/i),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Damaged package/ })).toHaveAttribute(
      "href",
      "/crm/support/tk-1",
    );
  });

  it("creates a ticket from the New ticket modal", async () => {
    mockCommon();
    let createBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/customers`, () =>
        HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                userId: "c-1",
                name: "Sita",
                handle: "sita",
                avatarUrl: null,
                orderCount: 1,
                itemCount: 1,
                totalPaid: 1000,
                firstOrderAt: null,
                lastOrderAt: null,
              },
            ],
            total: 1,
            hasMore: false,
            reason: null,
          },
        }),
      ),
      http.post(`${API_BASE}/crm/tickets`, async ({ request }) => {
        createBody = await request.json();
        return HttpResponse.json({ success: true, data: TICKET }, { status: 201 });
      }),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "New ticket" }));
    await user.type(await screen.findByLabelText("Title"), "Late delivery");
    await user.type(screen.getByLabelText("Description"), "Nothing arrived");
    await user.type(screen.getByLabelText("Customer"), "sita");
    await user.click(await screen.findByRole("option", { name: /Sita/ }));
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() =>
      expect(createBody).toMatchObject({
        type: "COMPLAINT",
        title: "Late delivery",
        subjectId: "c-1",
      }),
    );
    expect(await screen.findByText("Ticket created.")).toBeInTheDocument();
  });

  it("hides the New ticket button for a viewer with only tickets:read", async () => {
    mockCommon({ viewerIsSuperAdmin: false, viewerPermissionKeys: ["tickets:read"] });
    renderTicketsPage();

    await screen.findByRole("link", { name: /Damaged package/ });
    expect(screen.queryByRole("button", { name: "New ticket" })).not.toBeInTheDocument();
  });

  it("filters the ticket list by status and reflects it in the URL", async () => {
    mockCommon();
    let lastStatusParam: string | null = "unset";
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        lastStatusParam = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({ success: true, data: { tickets: [TICKET], nextCursor: null } });
      }),
    );

    const router = renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await screen.findByRole("link", { name: /Damaged package/ });
    await user.selectOptions(screen.getByLabelText("Filter by status"), "RESOLVED");

    await waitFor(() => expect(lastStatusParam).toBe("RESOLVED"));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ status: "RESOLVED" }));
  });

  it("filters by date range and keeps it in the URL", async () => {
    mockCommon();
    const seenQueries: URLSearchParams[] = [];
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        seenQueries.push(new URL(request.url).searchParams);
        return HttpResponse.json({ success: true, data: { tickets: [], nextCursor: null } });
      }),
    );

    renderTicketsPage("/crm/support?from=2026-08-01&to=2026-08-31");

    expect(await screen.findByText("No tickets match your filters.")).toBeInTheDocument();
    const latestQuery = seenQueries.at(-1);
    expect(latestQuery?.get("createdFrom")).toBe(new Date(2026, 7, 1).toISOString());
    expect(latestQuery?.get("createdTo")).toBe(
      new Date(2026, 7, 31, 23, 59, 59, 999).toISOString(),
    );
    expect(screen.getByLabelText("From date")).toHaveValue("2026-08-01");
  });

  it("filters by the person looking after the ticket", async () => {
    mockCommon();
    let lastAssignee: string | null = "unset";
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        lastAssignee = new URL(request.url).searchParams.get("assigneeMembershipId");
        return HttpResponse.json({ success: true, data: { tickets: [TICKET], nextCursor: null } });
      }),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await screen.findByRole("link", { name: /Damaged package/ });
    await user.selectOptions(await screen.findByLabelText("Filter by assignee"), "mem-1");

    await waitFor(() => expect(lastAssignee).toBe("mem-1"));
  });

  it("opens straight to tickets still open with no one on them", async () => {
    mockCommon();
    let lastQuery = new URLSearchParams();
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        lastQuery = new URL(request.url).searchParams;
        return HttpResponse.json({ success: true, data: { tickets: [TICKET], nextCursor: null } });
      }),
    );

    renderTicketsPage("/crm/support?status=ACTIVE&assignee=none");

    await screen.findByRole("link", { name: /Damaged package/ });
    expect(lastQuery.get("activeOnly")).toBe("true");
    expect(lastQuery.get("unassignedOnly")).toBe("true");
  });

  it("opens the new ticket form when the link asks for it", async () => {
    mockCommon();
    renderTicketsPage("/crm/support?new=yes");

    expect(await screen.findByRole("button", { name: "Create ticket" })).toBeInTheDocument();
  });

  it("reads the status filter from the URL on load", async () => {
    mockCommon();
    let lastStatusParam: string | null = "unset";
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        lastStatusParam = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({ success: true, data: { tickets: [TICKET], nextCursor: null } });
      }),
    );

    renderTicketsPage("/crm/support?status=CLOSED");

    await screen.findByRole("link", { name: /Damaged package/ });
    await waitFor(() => expect(lastStatusParam).toBe("CLOSED"));
  });

  it("names each missing field inline, not in a browser popup, when a ticket is submitted empty", async () => {
    mockCommon();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/crm/tickets`, () => {
        createRequested();
        return HttpResponse.json({ success: true, data: TICKET }, { status: 201 });
      }),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "New ticket" }));
    await user.click(await screen.findByRole("button", { name: "Create ticket" }));

    expect(await screen.findByText("Enter a title for the ticket.")).toBeInTheDocument();
    expect(screen.getByText("Describe the problem or request.")).toBeInTheDocument();
    expect(screen.getByText("Choose the customer this ticket is about.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });
});
