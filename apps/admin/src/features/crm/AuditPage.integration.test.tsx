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

import { AuditPage } from "./AuditPage";

const API_BASE = "http://localhost:3000/api";

const ORGANIZATION = {
  id: "o-1",
  name: "Meridian",
  plan: "trial",
  trialEndsAt: null,
  superAdminMembershipId: "m-1",
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: [],
  pendingOwnershipTransfer: null,
  advancedFeaturesEnabled: true,
};

const entry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: `e-${Math.random().toString(36).slice(2)}`,
  action: "ROLE_CREATED",
  outcome: "SUCCESS",
  summary: 'Created role "Analyst"',
  actorUserId: "u-1",
  actorName: "Bipin Karki",
  targetType: "role",
  targetId: "r-9",
  metadata: {},
  ipAddress: "10.0.0.1",
  createdAt: "2026-08-30T09:00:00.000Z",
  ...overrides,
});

const mockOrganization = () =>
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({ success: true, data: ORGANIZATION }),
    ),
  );

const renderAuditPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: AuditPage });
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
    history: createMemoryHistory({ initialEntries: ["/crm/audit"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("AuditPage", () => {
  it("renders audit entries with a human action label and the actor name", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/audit`, () =>
        HttpResponse.json({
          success: true,
          data: {
            entries: [
              entry({ action: "ORGANIZATION_RENAMED", summary: 'Renamed to "Meridian Co"' }),
              entry({ action: "INVITE_SENT", summary: "Invited a@x.test", actorName: null }),
            ],
            nextCursor: null,
          },
        }),
      ),
    );

    renderAuditPage();

    expect(await screen.findByText("Organization renamed")).toBeInTheDocument();
    expect(screen.getByText("Invite sent")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("shows an explicit empty state", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/audit`, () =>
        HttpResponse.json({ success: true, data: { entries: [], nextCursor: null } }),
      ),
    );

    renderAuditPage();

    expect(await screen.findByText("No audit entries yet.")).toBeInTheDocument();
  });

  it("shows an error banner when the log fails to load", async () => {
    mockOrganization();
    mswServer.use(
      http.get(
        `${API_BASE}/crm/audit`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Forbidden" }), {
            status: 403,
          }),
      ),
    );

    renderAuditPage();

    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });

  it("loads the next page when Load more is clicked", async () => {
    mockOrganization();
    let call = 0;
    mswServer.use(
      http.get(`${API_BASE}/crm/audit`, ({ request }) => {
        call += 1;
        const cursor = new URL(request.url).searchParams.get("cursor");
        return HttpResponse.json({
          success: true,
          data: {
            entries: [entry({ summary: cursor ? "Second page row" : "First page row" })],
            nextCursor: cursor ? null : "cursor-1",
          },
        });
      }),
    );

    renderAuditPage();
    const user = userEvent.setup({ delay: null });

    expect(await screen.findByText("First page row")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Second page row")).toBeInTheDocument();
    expect(call).toBe(2);
  });
});
