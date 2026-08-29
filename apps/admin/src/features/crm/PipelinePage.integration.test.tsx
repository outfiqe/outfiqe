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

import { PipelinePage } from "./PipelinePage";

const API_BASE = "http://localhost:3000/api";

const STAGES = [
  { id: "s-lead", organizationId: "o-1", name: "Lead", sortOrder: 0, isWon: false, isLost: false },
  { id: "s-won", organizationId: "o-1", name: "Won", sortOrder: 1, isWon: true, isLost: false },
];

const DEALS = [
  {
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
    partnerName: "Aasha Creator",
    partnerHandle: "aasha",
    status: "OPEN",
    closedAt: null,
    createdAt: "2026-08-20T00:00:00.000Z",
  },
];

const mockPipeline = (overrides: { patchDeal?: () => Response } = {}) => {
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
    http.get(`${API_BASE}/crm/pipeline/stages`, () =>
      HttpResponse.json({ success: true, data: STAGES }),
    ),
    http.get(`${API_BASE}/crm/deals`, () => HttpResponse.json({ success: true, data: DEALS })),
    http.patch(`${API_BASE}/crm/deals/d-1`, () =>
      overrides.patchDeal
        ? overrides.patchDeal()
        : HttpResponse.json({
            success: true,
            data: { ...DEALS[0], stageId: "s-won", status: "WON" },
          }),
    ),
  );
};

const renderPipelinePage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: PipelinePage });
  const children = [
    "/crm",
    "/crm/partners",
    "/crm/customers",
    "/crm/pipeline",
    "/crm/tasks",
    "/crm/billing",
  ].map((path) => createRoute({ getParentRoute: () => rootRoute, path }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(children),
    history: createMemoryHistory({ initialEntries: ["/crm/pipeline"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("PipelinePage", () => {
  it("renders the board with stages and deals", async () => {
    mockPipeline();
    renderPipelinePage();

    expect(await screen.findByText("Spring collab")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lead" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Won" })).toBeInTheDocument();
  });

  it("moves a deal to another stage from the card control", async () => {
    let patchBody: unknown;
    mockPipeline({
      patchDeal: () =>
        HttpResponse.json({ success: true, data: { ...DEALS[0], stageId: "s-won" } }),
    });
    mswServer.use(
      http.patch(`${API_BASE}/crm/deals/d-1`, async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ success: true, data: { ...DEALS[0], stageId: "s-won" } });
      }),
    );

    renderPipelinePage();
    const user = userEvent.setup();

    await user.selectOptions(await screen.findByLabelText("Move to"), "s-won");

    await waitFor(() => expect(patchBody).toEqual({ stageId: "s-won" }));
  });

  it("opens the new-deal modal", async () => {
    mockPipeline();
    mswServer.use(
      http.get(`${API_BASE}/crm/partners`, () =>
        HttpResponse.json({
          success: true,
          data: { items: [], total: 0, hasMore: false, reason: null },
        }),
      ),
    );

    renderPipelinePage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "New deal" }));

    expect(await screen.findByRole("heading", { name: "New deal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });
});
