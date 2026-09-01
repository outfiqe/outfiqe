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

import { CustomersPage } from "./CustomersPage";

const API_BASE = "http://localhost:3000/api";

const mockOrganization = () => {
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({
        success: true,
        data: {
          id: "org-1",
          name: "Meridian Apparel Co.",
          plan: "trial",
          trialEndsAt: null,
          linkedBrandId: "brand-1",
          superAdminMembershipId: "m-1",
          viewerIsSuperAdmin: true,
          viewerPermissionKeys: ["accounts:read", "customers:read", "billing:read"],
          pendingOwnershipTransfer: null,
          advancedFeaturesEnabled: true,
        },
      }),
    ),
  );
};

const mockCustomers = (data: Record<string, unknown>) => {
  mswServer.use(
    http.get(`${API_BASE}/crm/customers`, () => HttpResponse.json({ success: true, data })),
  );
};

const renderCustomersPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: CustomersPage });
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/crm/customers/$userId",
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

describe("CustomersPage", () => {
  it("renders the customer table", async () => {
    mockOrganization();
    mockCustomers({
      items: [
        {
          userId: "u-1",
          name: "Sita Shopper",
          handle: "sita",
          avatarUrl: null,
          orderCount: 4,
          itemCount: 9,
          totalPaid: 12000,
          firstOrderAt: "2026-05-01T00:00:00.000Z",
          lastOrderAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      total: 1,
      hasMore: false,
      reason: null,
    });

    renderCustomersPage();

    expect(await screen.findByText("Sita Shopper")).toBeInTheDocument();
    expect(screen.getByText("Rs. 12,000")).toBeInTheDocument();
  });

  it("shows the not-linked banner when the organization has no brand", async () => {
    mockOrganization();
    mockCustomers({
      items: [],
      total: 0,
      hasMore: false,
      reason: "ORGANIZATION_NOT_LINKED_TO_BRAND",
    });

    renderCustomersPage();

    expect(
      await screen.findByText(/isn't linked to a brand yet, so it has no customers/i),
    ).toBeInTheDocument();
  });
});
