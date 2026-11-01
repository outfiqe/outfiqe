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
import { describe, expect, it } from "vitest";

import { TicketDetailPage } from "./TicketDetailPage";

const API_BASE = "http://localhost:3000/api";
type ViewerAccess = { viewerIsSuperAdmin: boolean; viewerPermissionKeys: string[] };

const FULL_ACCESS: ViewerAccess = { viewerIsSuperAdmin: true, viewerPermissionKeys: [] };
const READ_ONLY_ACCESS = { viewerIsSuperAdmin: false, viewerPermissionKeys: ["tickets:read"] };

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
  comments: [],
};

const CONNECTIONS = {
  people: [{ userId: "c-1", name: "Sita Shopper", handle: "sita", role: "customer" }],
  contacts: null,
  deals: null,
  tickets: [],
  tasks: null,
};

const organizationFor = (viewer: ViewerAccess) =>
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
        pendingOwnershipTransfer: null,
        advancedFeaturesEnabled: true,
        ...viewer,
      },
    }),
  );

const mockTicketPage = (viewer = FULL_ACCESS) =>
  mswServer.use(
    organizationFor(viewer),
    http.get(`${API_BASE}/crm/tickets/tk-1`, () =>
      HttpResponse.json({ success: true, data: TICKET }),
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
    http.get(`${API_BASE}/crm/connections`, () =>
      HttpResponse.json({ success: true, data: CONNECTIONS }),
    ),
  );

const renderDetailPage = (initialPath: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/support/$ticketId",
    component: TicketDetailPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/support" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute, listRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return router;
};

const TICKET_PATH = "/_authenticated/crm/support/tk-1";

describe("TicketDetailPage", () => {
  it("shows what was reported, who raised it and the status controls", async () => {
    mockTicketPage();
    renderDetailPage(TICKET_PATH);

    expect(await screen.findByRole("heading", { name: "Damaged package" })).toBeInTheDocument();
    expect(screen.getByText("Arrived torn")).toBeInTheDocument();
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "In progress" })).toBeEnabled();
    expect(await screen.findByRole("link", { name: /Sita Shopper/ })).toHaveAttribute(
      "href",
      "/crm/customers/c-1",
    );
  });

  it("adds an internal comment", async () => {
    mockTicketPage();
    let postedBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/crm/tickets/tk-1/comments`, async ({ request }) => {
        postedBody = await request.json();
        return HttpResponse.json({ success: true, data: {} }, { status: 201 });
      }),
    );
    renderDetailPage(TICKET_PATH);
    const user = userEvent.setup({ delay: null });

    await user.type(await screen.findByLabelText("New comment"), "Refund approved");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() => expect(postedBody).toEqual({ body: "Refund approved" }));
  });

  it("moves a ticket forward and reassigns it", async () => {
    mockTicketPage();
    let statusBody: unknown;
    let assigneeBody: unknown;
    mswServer.use(
      http.patch(`${API_BASE}/crm/tickets/tk-1/status`, async ({ request }) => {
        statusBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: { ...TICKET, status: "IN_PROGRESS" },
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
    renderDetailPage(TICKET_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "In progress" }));
    await waitFor(() => expect(statusBody).toEqual({ status: "IN_PROGRESS" }));

    await user.selectOptions(await screen.findByLabelText("Assignee"), "mem-1");
    await waitFor(() => expect(assigneeBody).toEqual({ assigneeMembershipId: "mem-1" }));
  });

  it("disables every change for a viewer with only tickets:read", async () => {
    mockTicketPage(READ_ONLY_ACCESS);
    renderDetailPage(TICKET_PATH);

    expect(await screen.findByRole("button", { name: "In progress" })).toBeDisabled();
    expect(screen.getByLabelText("Assignee")).toBeDisabled();
    expect(screen.queryByLabelText("New comment")).not.toBeInTheDocument();
  });

  it("shows a clear message when the ticket doesn't exist", async () => {
    mockTicketPage();
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets/tk-1`, () =>
        HttpResponse.json({ success: false, message: "Ticket not found." }, { status: 404 }),
      ),
    );
    renderDetailPage(TICKET_PATH);

    expect(await screen.findByText("Ticket not found.")).toBeInTheDocument();
  });
});
