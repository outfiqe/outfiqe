import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PlatformMetricsPage } from "./PlatformMetricsPage";

const API_BASE = "http://localhost:3000/api";

const TENANT = {
  organizationId: "org-1",
  name: "Kiwi",
  subdomain: "kiwi",
  plan: "trial",
  subscriptionStatus: null,
  isPlatformOrg: false,
  linkedBrandId: null,
  linkedBrandName: null,
  ownerName: null,
  memberCount: 2,
  contactCount: 0,
  dealCount: 0,
  ticketCount: 0,
  activityCount: 0,
  lastCrmActivityAt: "2026-09-01T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
};

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
  return router;
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
        linkedBrandName: "Meridian",
        ownerName: "Sita Rai",
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
    expect(screen.getByText("1 business")).toBeInTheDocument();
  });

  it("asks for the picked plan and sort, and keeps them in the link", async () => {
    mockOverview();
    const requestedUrls: URL[] = [];
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return HttpResponse.json({
          success: true,
          data: { items: [TENANT], total: 1, hasMore: false },
        });
      }),
    );
    const user = userEvent.setup();
    const router = renderPage();

    await user.click(await screen.findByRole("button", { name: "Starter (2)" }));
    await user.click(
      within(screen.getByRole("columnheader", { name: "Deals" })).getByRole("button"),
    );

    await waitFor(() => {
      const lastRequest = requestedUrls.at(-1);
      expect(lastRequest?.searchParams.get("plan")).toBe("starter");
      expect(lastRequest?.searchParams.get("sort")).toBe("deals");
    });
    expect(router.state.location.search).toEqual({ plan: "starter", sort: "deals" });
  });

  it("searches by name once two letters are typed", async () => {
    mockOverview();
    const requestedUrls: URL[] = [];
    mswServer.use(
      http.get(`${API_BASE}/platform/metrics/tenants`, ({ request }) => {
        requestedUrls.push(new URL(request.url));
        return HttpResponse.json({
          success: true,
          data: { items: [TENANT], total: 1, hasMore: false },
        });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText("Search businesses"), "ki");

    await waitFor(() => expect(requestedUrls.at(-1)?.searchParams.get("search")).toBe("ki"));
  });

  it("says when a business has never used the CRM", async () => {
    mockOverview();
    mockTenants([{ ...TENANT, lastCrmActivityAt: null }]);

    renderPage();

    expect(await screen.findByText("Never used")).toBeInTheDocument();
  });

  it("opens a business from its row", async () => {
    mockOverview();
    mockTenants([TENANT]);
    const user = userEvent.setup();
    const router = renderPage();

    await user.click(await screen.findByRole("cell", { name: "Trial" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/platform/metrics/org-1"));
  });

  it("shows an empty state when no tenants match", async () => {
    mockOverview();
    mockTenants([]);

    renderPage();

    expect(await screen.findByText(/No businesses match this filter/i)).toBeInTheDocument();
  });
});
