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
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { PartnersPage } from "./PartnersPage";

const API_BASE = "http://localhost:3000/api";

const ORGANIZATION = {
  id: "org-1",
  name: "Meridian Apparel Co.",
  plan: "trial",
  trialEndsAt: null,
  superAdminMembershipId: "m-1",
  viewerIsSuperAdmin: true,
  viewerPermissionKeys: ["accounts:read", "customers:read", "billing:read"],
  pendingOwnershipTransfer: null,
  advancedFeaturesEnabled: true,
};

const mockOrganization = () => {
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({ success: true, data: ORGANIZATION }),
    ),
  );
};

const mockPartners = (data: Record<string, unknown>) => {
  mswServer.use(
    http.get(`${API_BASE}/crm/partners`, () => HttpResponse.json({ success: true, data })),
  );
};

const renderPartnersPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: PartnersPage });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/crm/partners/$creatorId",
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

describe("PartnersPage", () => {
  it("renders the partner table", async () => {
    mockOrganization();
    mockPartners({
      items: [
        {
          creatorId: "c-1",
          name: "Aasha Creator",
          handle: "aasha",
          avatarUrl: null,
          tagClickCount: 12,
          attributedOrderCount: 3,
          attributedRevenue: 4500,
          lastActivityAt: "2026-08-20T00:00:00.000Z",
        },
      ],
      total: 1,
      hasMore: false,
      reason: null,
    });

    renderPartnersPage();

    expect(await screen.findByText("Aasha Creator")).toBeInTheDocument();
    expect(screen.getByText("Rs. 4,500")).toBeInTheDocument();
    expect(screen.getByText("1 total")).toBeInTheDocument();
  });

  it("shows the not-linked banner when the organization has no brand", async () => {
    mockOrganization();
    mockPartners({
      items: [],
      total: 0,
      hasMore: false,
      reason: "ORGANIZATION_NOT_LINKED_TO_BRAND",
    });

    renderPartnersPage();

    expect(
      await screen.findByText(/isn't linked to a brand yet, so it has no partners/i),
    ).toBeInTheDocument();
  });

  it("shows an explicit empty state when the brand simply has no partners", async () => {
    mockOrganization();
    mockPartners({ items: [], total: 0, hasMore: false, reason: null });

    renderPartnersPage();

    expect(await screen.findByText("No partners yet.")).toBeInTheDocument();
  });

  it("shows an error banner when the list fails", async () => {
    mockOrganization();
    mswServer.use(
      http.get(
        `${API_BASE}/crm/partners`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "Trial ended",
              code: "ADVANCED_FEATURES_LOCKED",
            }),
            { status: 402 },
          ),
      ),
    );

    renderPartnersPage();

    await waitFor(() => expect(screen.getByText("Trial ended")).toBeInTheDocument());
  });
});
