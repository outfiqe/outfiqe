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

import { PlatformMetricsPage } from "./PlatformMetricsPage";

const API_BASE = "http://localhost:3000/api";

const mockOverview = () =>
  mswServer.use(
    http.get(`${API_BASE}/platform/metrics/overview`, () =>
      HttpResponse.json({
        success: true,
        data: {
          tenantCount: 3,
          tenantsByPlan: [
            { plan: "starter", count: 2 },
            { plan: "trial", count: 1 },
          ],
          totalContacts: 42,
          totalDeals: 9,
          totalTickets: 4,
          totalActivities: 30,
          totalMembers: 12,
        },
      }),
    ),
  );

const mockTenants = (items: unknown[]) =>
  mswServer.use(
    http.get(`${API_BASE}/platform/metrics/tenants`, () =>
      HttpResponse.json({ success: true, data: { items, total: items.length, hasMore: false } }),
    ),
  );

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: PlatformMetricsPage });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/platform/metrics/$orgId",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("PlatformMetricsPage", () => {
  it("shows the overview tiles and the tenant table", async () => {
    mockOverview();
    mockTenants([
      {
        organizationId: "org-1",
        name: "Meridian Apparel",
        subdomain: "meridian",
        plan: "starter",
        subscriptionStatus: "ACTIVE",
        isPlatformOrg: false,
        linkedBrandId: "brand-1",
        memberCount: 5,
        contactCount: 20,
        dealCount: 4,
        ticketCount: 2,
        activityCount: 15,
        lastCrmActivityAt: "2026-08-30T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
      },
    ]);

    renderPage();

    expect(await screen.findByText("Meridian Apparel")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("1 tenants")).toBeInTheDocument();
  });

  it("shows an empty state when no tenants match", async () => {
    mockOverview();
    mockTenants([]);

    renderPage();

    expect(await screen.findByText(/No tenants match this filter/i)).toBeInTheDocument();
  });
});
