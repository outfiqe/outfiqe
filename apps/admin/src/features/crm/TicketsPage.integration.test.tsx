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

const mockCommon = () => {
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({
        success: true,
        data: {
          id: "o-1",
          name: "Meridian",
          plan: "trial",
          trialEndsAt: null,
          superAdminMembershipId: "m-1",
          viewerIsSuperAdmin: true,
          viewerPermissionKeys: [],
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

const renderTicketsPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: TicketsPage });
  const children = [
    "/crm",
    "/crm/partners",
    "/crm/customers",
    "/crm/pipeline",
    "/crm/tasks",
    "/crm/support",
    "/crm/billing",
  ].map((path) => createRoute({ getParentRoute: () => rootRoute, path }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/crm/support"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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
    const user = userEvent.setup();

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
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Damaged package/ }));
    await user.type(await screen.findByLabelText("New comment"), "Refund approved");
    await user.click(screen.getByRole("button", { name: "Comment" }));

    await waitFor(() => expect(postedBody).toEqual({ body: "Refund approved" }));
  });
});
