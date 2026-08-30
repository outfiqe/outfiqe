import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { RolesPage } from "./RolesPage";

const API_BASE = "http://localhost:3000/api";

const renderRolesPage = () => {
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
    http.get(`${API_BASE}/crm/roles`, () =>
      HttpResponse.json({
        success: true,
        data: [
          { id: "r-1", name: "Admin", isBuiltIn: true, permissionKeys: ["members:read"] },
          { id: "r-2", name: "Support agent", isBuiltIn: false, permissionKeys: ["tickets:read"] },
        ],
      }),
    ),
    http.get(`${API_BASE}/crm/permissions`, () =>
      HttpResponse.json({
        success: true,
        data: [{ key: "tickets:read", label: "View tickets", group: "Support" }],
      }),
    ),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: RolesPage });
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
    history: createMemoryHistory({ initialEntries: ["/crm/roles"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("RolesPage", () => {
  it("renders the roles-and-settings shell with the role list", async () => {
    renderRolesPage();

    expect(await screen.findByRole("heading", { name: "Roles & settings" })).toBeInTheDocument();
    expect(await screen.findByText("Support agent")).toBeInTheDocument();
    expect(screen.getByText("Built-in")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization name")).toHaveValue("Meridian");
  });
});
