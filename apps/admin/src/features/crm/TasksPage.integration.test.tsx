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

import { TasksPage } from "./TasksPage";

const API_BASE = "http://localhost:3000/api";

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
  );
};

const renderTasksPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: TasksPage });
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
    history: createMemoryHistory({ initialEntries: ["/crm/tasks"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("TasksPage", () => {
  it("lists tasks and flags an overdue one", async () => {
    mockCommon();
    mswServer.use(
      http.get(`${API_BASE}/crm/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "t-1",
              organizationId: "o-1",
              title: "Chase invoice",
              description: null,
              dueAt: "2020-01-01T00:00:00.000Z",
              status: "OPEN",
              assigneeMembershipId: "mem-1",
              assigneeName: "Bipin Karki",
              createdByMembershipId: "mem-1",
              partnerCreatorId: null,
              customerUserId: null,
              dealId: null,
              completedAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    renderTasksPage();

    expect(await screen.findByText("Chase invoice")).toBeInTheDocument();
    expect(screen.getByText("overdue")).toBeInTheDocument();
  });

  it("toggles a task to done", async () => {
    mockCommon();
    let patchBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/tasks`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "t-2",
              organizationId: "o-1",
              title: "Send brief",
              description: null,
              dueAt: "2030-01-01T00:00:00.000Z",
              status: "OPEN",
              assigneeMembershipId: "mem-1",
              assigneeName: "Bipin Karki",
              createdByMembershipId: "mem-1",
              partnerCreatorId: null,
              customerUserId: null,
              dealId: null,
              completedAt: null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
      http.patch(`${API_BASE}/crm/tasks/t-2`, async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true, data: {} });
      }),
    );

    renderTasksPage();
    const user = userEvent.setup();

    await user.click(await screen.findByLabelText(/Mark Send brief done/));

    await waitFor(() => expect(patchBody).toEqual({ status: "DONE" }));
  });
});
