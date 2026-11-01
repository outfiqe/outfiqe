import { Toaster } from "@outfiqe/design-system";
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

import { DealDetailPage } from "./DealDetailPage";

const API_BASE = "http://localhost:3000/api";
type ViewerAccess = { viewerIsSuperAdmin: boolean; viewerPermissionKeys: string[] };

const FULL_ACCESS: ViewerAccess = { viewerIsSuperAdmin: true, viewerPermissionKeys: [] };
const DUE_DATE = "2026-11-10T00:00:00.000Z";
const READ_ONLY_ACCESS = { viewerIsSuperAdmin: false, viewerPermissionKeys: ["deals:read"] };

const STAGES = [
  { id: "s-lead", organizationId: "o-1", name: "Lead", sortOrder: 0, isWon: false, isLost: false },
];

const DEAL = {
  id: "d-1",
  organizationId: "o-1",
  stageId: "s-lead",
  stageName: "Lead",
  title: "Spring collab",
  value: 50000,
  currency: "NPR",
  expectedCloseDate: null,
  ownerMembershipId: null,
  ownerName: null,
  partnerCreatorId: "c-1",
  partnerName: "Aasha Muse",
  partnerHandle: "aasha",
  status: "OPEN",
  closedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

const CONNECTIONS = {
  people: [{ userId: "c-1", name: "Aasha Muse", handle: "aasha", role: "partner" }],
  contacts: [{ id: "ct-1", name: "Muse Manager", company: null, lifecycleStage: "LEAD" }],
  deals: [],
  tickets: [{ id: "tk-1", title: "Late payout", type: "COMPLAINT", status: "OPEN" }],
  tasks: [{ id: "ts-1", title: "Send the brief", dueAt: DUE_DATE, assigneeName: "Bipin Karki" }],
};

const organizationFor = (viewer: ViewerAccess) =>
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
        pendingOwnershipTransfer: null,
        advancedFeaturesEnabled: true,
        ...viewer,
      },
    }),
  );

const mockDealPage = (viewer = FULL_ACCESS) =>
  mswServer.use(
    organizationFor(viewer),
    http.get(`${API_BASE}/crm/deals/d-1`, () => HttpResponse.json({ success: true, data: DEAL })),
    http.get(`${API_BASE}/crm/pipeline/stages`, () =>
      HttpResponse.json({ success: true, data: STAGES }),
    ),
    http.get(`${API_BASE}/crm/deals`, () => HttpResponse.json({ success: true, data: [DEAL] })),
    http.get(`${API_BASE}/crm/timeline`, () =>
      HttpResponse.json({ success: true, data: { entries: [], partial: false } }),
    ),
    http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${API_BASE}/crm/connections`, () =>
      HttpResponse.json({ success: true, data: CONNECTIONS }),
    ),
  );

const renderDetailPage = (initialPath: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/pipeline/$dealId",
    component: DealDetailPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/pipeline" });
  const router = createRouter({
    routeTree: rootRoute.addChildren([detailRoute, listRoute]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return router;
};

const DEAL_PATH = "/_authenticated/crm/pipeline/d-1";

describe("DealDetailPage", () => {
  it("shows the opportunity's facts and links to its partner", async () => {
    mockDealPage();
    renderDetailPage(DEAL_PATH);

    expect(await screen.findByRole("heading", { name: "Spring collab" })).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
  });

  it("links to everyone and everything connected to the opportunity", async () => {
    mockDealPage();
    renderDetailPage(DEAL_PATH);

    expect(await screen.findByRole("link", { name: /Aasha Muse/ })).toHaveAttribute(
      "href",
      "/crm/partners/c-1",
    );
    expect(screen.getByRole("link", { name: /Muse Manager/ })).toHaveAttribute(
      "href",
      "/crm/contacts/ct-1",
    );
    expect(screen.getByRole("link", { name: /Late payout/ })).toHaveAttribute(
      "href",
      "/crm/support/tk-1",
    );
    expect(screen.getByText("Send the brief")).toBeInTheDocument();
    expect(screen.getByText("No other opportunities yet.")).toBeInTheDocument();
  });

  it("adds a task tied to this opportunity", async () => {
    mockDealPage();
    let taskBody: unknown;
    mswServer.use(
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
      http.post(`${API_BASE}/crm/tasks`, async ({ request }) => {
        taskBody = await request.json();
        return HttpResponse.json({ success: true, data: {} }, { status: 201 });
      }),
    );
    renderDetailPage(DEAL_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Add a task" }));
    await user.type(await screen.findByLabelText("Title"), "Call the partner");
    await user.click(screen.getByRole("button", { name: "Create task" }));

    await waitFor(() =>
      expect(taskBody).toMatchObject({
        title: "Call the partner",
        subjectType: "deal",
        subjectId: "d-1",
      }),
    );
  });

  it("explains when connected records can't be loaded", async () => {
    mockDealPage();
    mswServer.use(
      http.get(`${API_BASE}/crm/connections`, () =>
        HttpResponse.json({ success: false, message: "Something broke." }, { status: 500 }),
      ),
    );
    renderDetailPage(DEAL_PATH);

    expect(
      await screen.findByText("Connected people are unavailable right now."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Spring collab" })).toBeInTheDocument();
  });

  it("shows the closing date only once the opportunity has closed", async () => {
    mockDealPage();
    mswServer.use(
      http.get(`${API_BASE}/crm/deals/d-1`, () =>
        HttpResponse.json({
          success: true,
          data: { ...DEAL, status: "WON", closedAt: "2026-09-01T00:00:00.000Z" },
        }),
      ),
    );
    renderDetailPage(DEAL_PATH);

    expect(await screen.findByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Won")).toBeInTheDocument();
  });

  it("opens the edit form with the opportunity filled in", async () => {
    mockDealPage();
    renderDetailPage(DEAL_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    expect(await screen.findByDisplayValue("Spring collab")).toBeInTheDocument();
  });

  it("deletes after the warning and returns to the sales board", async () => {
    mockDealPage();
    let deleteCount = 0;
    mswServer.use(
      http.delete(`${API_BASE}/crm/deals/d-1`, () => {
        deleteCount += 1;
        return HttpResponse.json({ success: true, data: null });
      }),
    );
    const router = renderDetailPage(DEAL_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(deleteCount).toBe(0);
    const warning = await screen.findByRole("dialog", { name: "Delete this opportunity?" });
    await user.click(within(warning).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/crm/pipeline"));
    expect(deleteCount).toBe(1);
    expect(await screen.findByText("Opportunity deleted.")).toBeInTheDocument();
  });

  it("stays on the page and says why when the delete fails", async () => {
    mockDealPage();
    mswServer.use(
      http.delete(`${API_BASE}/crm/deals/d-1`, () =>
        HttpResponse.json(
          { success: false, message: "You do not have permission to do this." },
          { status: 403 },
        ),
      ),
    );
    const router = renderDetailPage(DEAL_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const warning = await screen.findByRole("dialog", { name: "Delete this opportunity?" });
    await user.click(within(warning).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("You do not have permission to do this.")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(DEAL_PATH);
  });

  it("hides Edit and Delete for a viewer who can only read", async () => {
    mockDealPage(READ_ONLY_ACCESS);
    renderDetailPage(DEAL_PATH);

    expect(await screen.findByRole("heading", { name: "Spring collab" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows a clear message when the opportunity doesn't exist", async () => {
    mockDealPage();
    mswServer.use(
      http.get(`${API_BASE}/crm/deals/d-1`, () =>
        HttpResponse.json({ success: false, message: "Opportunity not found." }, { status: 404 }),
      ),
    );
    renderDetailPage(DEAL_PATH);

    expect(await screen.findByText("Opportunity not found.")).toBeInTheDocument();
  });
});
