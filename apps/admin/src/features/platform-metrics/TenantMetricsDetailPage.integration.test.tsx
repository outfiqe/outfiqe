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

import { TenantMetricsDetailPage } from "./TenantMetricsDetailPage";

const API_BASE = "http://localhost:3000/api";

const sparkPoint = (day: string) => ({
  day,
  contactCount: 1,
  dealCount: 1,
  ticketCount: 1,
  activityCount: 4,
  activeMemberCount: 2,
});

const detail = (overrides: Record<string, unknown> = {}) => ({
  organizationId: "org-1",
  name: "Kastha Studio",
  subdomain: "kastha",
  plan: "growth",
  subscriptionStatus: "ACTIVE",
  isPlatformOrg: false,
  linkedBrandId: null,
  memberCount: 4,
  contactCount: 12,
  dealCount: 3,
  ticketCount: 2,
  activityCount: 40,
  lastCrmActivityAt: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  partnerCount: 5,
  customerCount: 9,
  series: [] as ReturnType<typeof sparkPoint>[],
  ...overrides,
});

const renderPage = (path = "/_authenticated/platform/metrics/org-1") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/platform/metrics/$orgId",
    component: TenantMetricsDetailPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/platform/metrics" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute, listRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("TenantMetricsDetailPage", () => {
  it("shows the tenant summary, its metrics and a not-enough-history note", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({ success: true, data: detail() }),
      ),
    );

    renderPage();

    expect(await screen.findByRole("heading", { name: "Kastha Studio" })).toBeInTheDocument();
    expect(screen.getByText("kastha · growth (active)")).toBeInTheDocument();
    expect(screen.getByText("Partners")).toBeInTheDocument();
    expect(screen.getByText("Not enough history yet for a trend.")).toBeInTheDocument();
  });

  it("renders the activity trend chart once there are at least two points", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({
          success: true,
          data: detail({ series: [sparkPoint("2026-08-30"), sparkPoint("2026-08-31")] }),
        }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole("img", { name: "Activity per day over the recorded window" }),
    ).toBeInTheDocument();
  });

  it("omits the subscription status and dashes the last-activity when they are absent", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({
          success: true,
          data: detail({ subscriptionStatus: null, lastCrmActivityAt: null }),
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("kastha · growth")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("surfaces a load error", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({ success: false, message: "Tenant not found." }, { status: 404 }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Tenant not found.")).toBeInTheDocument();
  });
});
