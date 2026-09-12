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
import { describe, expect, it } from "vitest";

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
    http.get(`${API_BASE}/crm/tickets`, () => HttpResponse.json({ success: true, data: [TICKET] })),
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
    </QueryClientProvider>,
  );
  return router;
};

describe("TicketsPage", () => {
  it("lists tickets and expands a detail view with a forward status control", async () => {
    mockCommon();
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets/tk-1`, () =>
        HttpResponse.json({ success: true, data: { ...TICKET, comments: [] } }),
      ),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: /Damaged package/ }));

    expect(await screen.findByText("Arrived torn")).toBeInTheDocument();
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "in progress" })).toBeEnabled();
  });

  it("posts an internal comment from the detail view", async () => {
    mockCommon();
    let postedBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets/tk-1`, () =>
        HttpResponse.json({ success: true, data: { ...TICKET, comments: [] } }),
      ),
      http.post(`${API_BASE}/crm/tickets/tk-1/comments`, async ({ request }) => {
        postedBody = await request.json();
        return HttpResponse.json({ success: true, data: {} }, { status: 201 });
      }),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: /Damaged package/ }));
    await user.type(await screen.findByLabelText("New comment"), "Refund approved");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() => expect(postedBody).toEqual({ body: "Refund approved" }));
  });

  it("moves a ticket forward and reassigns it from the detail view", async () => {
    mockCommon();
    let statusBody: unknown;
    let assigneeBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets/tk-1`, () =>
        HttpResponse.json({ success: true, data: { ...TICKET, comments: [] } }),
      ),
      http.patch(`${API_BASE}/crm/tickets/tk-1/status`, async ({ request }) => {
        statusBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { ...TICKET, status: "IN_PROGRESS", comments: [] },
        });
      }),
      http.patch(`${API_BASE}/crm/tickets/tk-1/assignee`, async ({ request }) => {
        assigneeBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { ...TICKET, assigneeMembershipId: "mem-1" },
        });
      }),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: /Damaged package/ }));
    await user.click(await screen.findByRole("button", { name: "in progress" }));
    await waitFor(() => expect(statusBody).toEqual({ status: "IN_PROGRESS" }));

    await user.selectOptions(await screen.findByLabelText("Assignee"), "mem-1");
    await waitFor(() => expect(assigneeBody).toEqual({ assigneeMembershipId: "mem-1" }));
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
  });

  it("hides write controls for a viewer with only tickets:read", async () => {
    mockCommon({ viewerIsSuperAdmin: false, viewerPermissionKeys: ["tickets:read"] });
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets/tk-1`, () =>
        HttpResponse.json({ success: true, data: { ...TICKET, comments: [] } }),
      ),
    );

    renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    expect(screen.queryByRole("button", { name: "New ticket" })).not.toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /Damaged package/ }));

    expect(await screen.findByRole("button", { name: "in progress" })).toBeDisabled();
    expect(screen.getByLabelText("Assignee")).toBeDisabled();
    expect(screen.queryByLabelText("New comment")).not.toBeInTheDocument();
  });

  it("filters the ticket list by status and reflects it in the URL", async () => {
    mockCommon();
    let lastStatusParam: string | null = "unset";
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        lastStatusParam = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({ success: true, data: [TICKET] });
      }),
    );

    const router = renderTicketsPage();
    const user = userEvent.setup({ delay: null });

    await screen.findByRole("button", { name: /Damaged package/ });
    await user.selectOptions(screen.getByLabelText("Filter by status"), "RESOLVED");

    await waitFor(() => expect(lastStatusParam).toBe("RESOLVED"));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ status: "RESOLVED" }));
  });

  it("reads the status filter from the URL on load", async () => {
    mockCommon();
    let lastStatusParam: string | null = "unset";
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, ({ request }) => {
        lastStatusParam = new URL(request.url).searchParams.get("status");
        return HttpResponse.json({ success: true, data: [TICKET] });
      }),
    );

    renderTicketsPage("/crm/support?status=CLOSED");

    await screen.findByRole("button", { name: /Damaged package/ });
    await waitFor(() => expect(lastStatusParam).toBe("CLOSED"));
  });
});
