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
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { TenantMetricsDetailPage } from "./TenantMetricsDetailPage";

const API_BASE = "http://localhost:3000/api";
const ACTIVITY_CHART_NAME = "Activities per day over the last 30 days";

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
  linkedBrandId: "brand-1",
  linkedBrandName: "Kastha",
  ownerName: "Sita Rai",
  ownerEmail: "sita@example.com",
  trialEndsAt: null,
  seats: 5,
  currentPeriodEnd: "2026-11-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  pendingInviteCount: 1,
  activeMemberCount: 3,
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
  const supportRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/platform/impersonation",
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute, listRoute, supportRoute]),
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
    expect(screen.getAllByText("Growth")).toHaveLength(2);
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(
      screen.getByText(/Kastha Studio has 4 members and last used the CRM on/),
    ).toBeInTheDocument();
    expect(screen.getByText("Partners")).toBeInTheDocument();
    expect(screen.getByText("Sita Rai")).toBeInTheDocument();
    expect(screen.getByText("sita@example.com")).toBeInTheDocument();
    expect(screen.getByText("Renews on")).toBeInTheDocument();
    expect(screen.getByText("Invites waiting")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kastha" })).toHaveAttribute(
      "href",
      expect.stringContaining("/brand/brand-1"),
    );
    expect(screen.getByRole("link", { name: "View as support" })).toHaveAttribute(
      "href",
      expect.stringContaining("org=org-1"),
    );
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

    expect(await screen.findByRole("img", { name: ACTIVITY_CHART_NAME })).toBeInTheDocument();
  });

  it("charts whichever measure is picked", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({
          success: true,
          data: detail({ series: [sparkPoint("2026-08-30"), sparkPoint("2026-08-31")] }),
        }),
      ),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: "Tickets" }));

    expect(
      await screen.findByRole("img", { name: "Tickets per day over the last 30 days" }),
    ).toBeInTheDocument();
  });

  it("shows a plain message, not a flat line, when every day in the window had no activity", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({
          success: true,
          data: detail({
            series: [
              { ...sparkPoint("2026-08-30"), activityCount: 0 },
              { ...sparkPoint("2026-08-31"), activityCount: 0 },
            ],
          }),
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("Nothing recorded in this window yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: ACTIVITY_CHART_NAME })).not.toBeInTheDocument();
  });

  it("explains a business with no subscription and no activity yet", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants/org-1`, () =>
        HttpResponse.json({
          success: true,
          data: detail({
            subscriptionStatus: null,
            lastCrmActivityAt: null,
            ownerName: null,
            ownerEmail: null,
            currentPeriodEnd: null,
            seats: null,
          }),
        }),
      ),
    );

    renderPage();

    expect(await screen.findByText("No subscription")).toBeInTheDocument();
    expect(screen.getByText("Never used")).toBeInTheDocument();
    expect(screen.getByText("Hasn't accepted yet")).toBeInTheDocument();
    expect(screen.getByText(/hasn't used the CRM yet/)).toBeInTheDocument();
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
