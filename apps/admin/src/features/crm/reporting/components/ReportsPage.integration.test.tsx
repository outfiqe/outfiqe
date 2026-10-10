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

import { ReportsPage } from "./ReportsPage";

const API_BASE = "http://localhost:3000/api";

const EMPTY_PIPELINE = {
  stages: [],
  totals: { openDealCount: 0, openValue: 0, wonDealCount: 0, wonValue: 0, lostDealCount: 0 },
};

const renderReportsPage = (advancedFeaturesEnabled = true) => {
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
          viewerIsSuperAdmin: true,
          viewerPermissionKeys: [],
          pendingOwnershipTransfer: null,
          advancedFeaturesEnabled,
        },
      }),
    ),
    http.get(`${API_BASE}/crm/reports/pipeline`, () =>
      HttpResponse.json({ success: true, data: EMPTY_PIPELINE }),
    ),
    http.get(`${API_BASE}/crm/reports/tickets`, () =>
      HttpResponse.json({
        success: true,
        data: { statusCounts: [], openCount: 0, resolvedCount: 0, meanResolutionSeconds: null },
      }),
    ),
  );

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: ReportsPage });
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
    history: createMemoryHistory({ initialEntries: ["/crm/reports"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("ReportsPage", () => {
  it("renders the tab strip and both report cards", async () => {
    renderReportsPage();

    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(await screen.findByText("Pipeline value by stage")).toBeInTheDocument();
    expect(screen.getByText("Support tickets")).toBeInTheDocument();
  });

  it("shows the plan-gate banner when advanced features are locked", async () => {
    renderReportsPage(false);

    expect(await screen.findByRole("heading", { name: "Reports" })).toBeInTheDocument();
    expect(await screen.findByText(/Your trial has ended/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to billing" })).toBeInTheDocument();
  });
});
