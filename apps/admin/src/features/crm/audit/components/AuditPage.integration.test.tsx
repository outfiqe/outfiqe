import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  linkedBrandId: "brand-1",
  superAdminMembershipId: "m-1",
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: [],
  pendingOwnershipTransfer: null,
  advancedFeaturesEnabled: true,
};

const ACTOR_MEMBER = {
  membershipId: "m-1",
  roleName: "Admin",
  joinedAt: "2026-01-05T00:00:00.000Z",
};

const PERIOD_SUMMARY = {
  sales: { newDealCount: 0, wonDealCount: 0, wonValue: 0, lostDealCount: 0 },
  support: { openedCount: 0, resolvedCount: 0, meanResolutionSeconds: null },
  team: [
    {
      ...ACTOR_MEMBER,
      name: "Bipin Karki",
      avatarUrl: null,
      wonDealCount: 2,
      wonValue: 9000,
      resolvedTicketCount: 1,
      completedTaskCount: 3,
      activityCount: 4,
    },
  ],
};

const entry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: `e-${Math.random().toString(36).slice(2)}`,
  action: "ROLE_CREATED",
  outcome: "SUCCESS",
  summary: 'Created role "Analyst"',
  actorUserId: "u-1",
  actorName: "Bipin Karki",
  actorAvatarUrl: "https://img.test/bipin.jpg",
  actorMember: ACTOR_MEMBER,
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
  return router;
};

const CHECKOUT_ENTRY = {
  action: "SUBSCRIPTION_CHECKOUT_STARTED",
  outcome: "SUCCESS",
  summary: "Started checkout for the starter plan (1 seats)",
  actorUserId: "u-1",
  actorName: "Bipin Karki",
  actorAvatarUrl: "https://img.test/bipin.jpg",
  actorMember: ACTOR_MEMBER,
  targetType: "subscription",
  targetId: null,
  metadata: { plan: "starter" },
  ipAddress: null,
  createdAt: "2026-11-01T00:00:00.000Z",
};

const mockActorEntries = (
  seenActors: (string | null)[],
  actorMember: typeof ACTOR_MEMBER | null,
) => {
  mockOrganization();
  mswServer.use(
    http.get(`${API_BASE}/crm/audit/filters`, () =>
      HttpResponse.json({ success: true, data: { actions: [], actors: [] } }),
    ),
    http.get(`${API_BASE}/crm/audit`, ({ request }) => {
      seenActors.push(new URL(request.url).searchParams.get("actorUserId"));
      return HttpResponse.json({
        success: true,
        data: { entries: [entry({ actorMember })], nextCursor: null },
      });
    }),
    http.get(`${API_BASE}/crm/members`, () =>
      HttpResponse.json({
        success: true,
        data: [
          {
            id: "m-1",
            userId: "u-1",
            userName: "Bipin Karki",
            userEmail: "bipin@meridian.test",
            roleId: "r-1",
            roleName: "Admin",
            status: "ACTIVE",
            isSuperAdmin: true,
            createdAt: "2026-01-05T00:00:00.000Z",
          },
        ],
      }),
    ),
    http.get(`${API_BASE}/crm/reports/summary`, () =>
      HttpResponse.json({ success: true, data: PERIOD_SUMMARY }),
    ),
  );
};

const mockAuditEntries = (seenGroups: (string | null)[]) =>
  mswServer.use(
    http.get(`${API_BASE}/crm/audit/filters`, () =>
      HttpResponse.json({ success: true, data: { actions: [], actors: [] } }),
    ),
    http.get(`${API_BASE}/crm/audit`, ({ request }) => {
      seenGroups.push(new URL(request.url).searchParams.get("group"));
      return HttpResponse.json({
        success: true,
        data: {
          entries: [
            { ...CHECKOUT_ENTRY, id: "a-1" },
            { ...CHECKOUT_ENTRY, id: "a-2" },
            { ...CHECKOUT_ENTRY, id: "a-3" },
          ],
          nextCursor: null,
        },
      });
    }),
  );

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

  it("filters by group, keeps it in the link and opens an entry's details", async () => {
    const seenGroups: (string | null)[] = [];
    mockAuditEntries(seenGroups);
    const router = renderAuditPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Billing" }));

    await waitFor(() => expect(seenGroups).toContain("billing"));
    await waitFor(() => expect(router.state.location.search).toMatchObject({ group: "billing" }));

    await user.click(await screen.findByRole("cell", { name: /starter plan \(1 seat\)/ }));

    const panel = await screen.findByRole("dialog", { name: "Checkout started" });
    expect(within(panel).getByRole("link", { name: "See billing" })).toHaveAttribute(
      "href",
      "/crm/billing",
    );
    expect(within(panel).getByText("3 times in a row")).toBeInTheDocument();
  });

  it("opens the person, not the entry, from the Who column, then filters to them", async () => {
    const seenActors: (string | null)[] = [];
    mockActorEntries(seenActors, ACTOR_MEMBER);
    const router = renderAuditPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Bipin Karki" }));

    const panel = await screen.findByRole("dialog", { name: "Bipin Karki" });
    expect(screen.queryByRole("dialog", { name: "Role created" })).not.toBeInTheDocument();
    expect(await within(panel).findByText("bipin@meridian.test")).toBeInTheDocument();
    expect(await within(panel).findByText("In the last 30 days")).toBeInTheDocument();
    expect(within(panel).getByText("Admin")).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "See everything they did" }));

    await waitFor(() => expect(router.state.location.search).toMatchObject({ who: "u-1" }));
    await waitFor(() => expect(seenActors).toContain("u-1"));
  });

  it("moves from an entry's panel to the person", async () => {
    mockActorEntries([], ACTOR_MEMBER);
    renderAuditPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("cell", { name: /Created role/ }));
    const entryPanel = await screen.findByRole("dialog", { name: "Role created" });
    fireEvent.click(within(entryPanel).getByRole("button", { name: "Bipin Karki" }));

    expect(await screen.findByRole("dialog", { name: "Bipin Karki" })).toBeInTheDocument();
  });

  it("says when someone has left the team", async () => {
    mockActorEntries([], null);
    renderAuditPage();
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Bipin Karki" }));

    expect(await screen.findByText("No longer on your team.")).toBeInTheDocument();
  });

  it("shows automatic entries as System with nothing to click", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/audit/filters`, () =>
        HttpResponse.json({ success: true, data: { actions: [], actors: [] } }),
      ),
      http.get(`${API_BASE}/crm/audit`, () =>
        HttpResponse.json({
          success: true,
          data: {
            entries: [
              entry({
                actorUserId: null,
                actorName: null,
                actorAvatarUrl: null,
                actorMember: null,
              }),
            ],
            nextCursor: null,
          },
        }),
      ),
    );

    renderAuditPage();

    expect(await screen.findByRole("cell", { name: "System" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "System" })).not.toBeInTheDocument();
  });

  it("shows an explicit empty state", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/audit`, () =>
        HttpResponse.json({ success: true, data: { entries: [], nextCursor: null } }),
      ),
    );

    renderAuditPage();

    expect(await screen.findByText(/No audit entries yet/)).toBeInTheDocument();
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
