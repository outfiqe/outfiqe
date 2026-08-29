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
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CrmPage } from "./CrmPage";

const API_BASE = "http://localhost:3000/api";
const CURRENT_USER_ID = "current-user-id";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    state: { status: "signed-in", user: { id: CURRENT_USER_ID } },
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: () => <>{children}</> });
  const childRoutes = [
    "/crm",
    "/crm/partners",
    "/crm/customers",
    "/crm/pipeline",
    "/crm/tasks",
    "/crm/support",
    "/crm/billing",
  ].map((path) => createRoute({ getParentRoute: () => rootRoute, path }));
  const router = createRouter({
    routeTree: rootRoute.addChildren(childRoutes),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

const mockOrganizationEndpoint = (
  overrides: Partial<{
    viewerIsSuperAdmin: boolean;
    viewerPermissionKeys: string[];
    advancedFeaturesEnabled: boolean;
    pendingOwnershipTransfer: {
      id: string;
      toMembershipId: string;
      toUserId: string;
      toUserName: string;
      fromUserName: string;
      removeSenderMembershipOnAccept: boolean;
      expiresAt: string;
    } | null;
  }> = {},
) => {
  mswServer.use(
    http.get(`${API_BASE}/crm/organization`, () =>
      HttpResponse.json({
        success: true,
        data: {
          id: "org-1",
          name: "Meridian Apparel Co.",
          subdomain: "meridian",
          plan: "trial",
          trialEndsAt: "2026-09-08T00:00:00.000Z",
          superAdminMembershipId: "membership-1",
          viewerIsSuperAdmin: false,
          viewerPermissionKeys: [],
          pendingOwnershipTransfer: null,
          advancedFeaturesEnabled: true,
          ...overrides,
        },
      }),
    ),
  );
};

describe("CrmPage", () => {
  it("renders the organization banner alongside the members and invite sections", async () => {
    mockOrganizationEndpoint({ viewerIsSuperAdmin: true });
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_BASE}/crm/invites`, () => HttpResponse.json({ success: true, data: [] })),
    );

    render(<CrmPage />, { wrapper });

    expect(await screen.findByText(/Meridian Apparel Co\. · trial/)).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Invite a staff member")).toBeInTheDocument();
  });

  it("tells the viewer to check their subdomain when they have no access to this organization", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/crm/organization`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "You do not have permission to do this.",
              code: "FORBIDDEN",
            }),
            { status: 403 },
          ),
      ),
    );

    render(<CrmPage />, { wrapper });

    expect(
      await screen.findByText(/make sure you're on that organization's own subdomain/),
    ).toBeInTheDocument();
  });

  it("hides members and invite sections for a role without those permissions", async () => {
    mockOrganizationEndpoint({ viewerPermissionKeys: ["org:read", "deals:read"] });

    render(<CrmPage />, { wrapper });

    expect(await screen.findByText(/Meridian Apparel Co\. · trial/)).toBeInTheDocument();
    expect(screen.getByText("There's nothing here for your role yet.")).toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();
    expect(screen.queryByText("Invite a staff member")).not.toBeInTheDocument();
  });

  it("shows the SUPERADMIN a cancel option for a transfer they started", async () => {
    mockOrganizationEndpoint({
      viewerIsSuperAdmin: true,
      pendingOwnershipTransfer: {
        id: "transfer-1",
        toMembershipId: "membership-2",
        toUserId: "some-other-user-id",
        toUserName: "Sunita Adhikari",
        fromUserName: "Bipin Karki",
        removeSenderMembershipOnAccept: false,
        expiresAt: "2026-09-08T00:00:00.000Z",
      },
    });
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
      http.get(`${API_BASE}/crm/invites`, () => HttpResponse.json({ success: true, data: [] })),
    );

    render(<CrmPage />, { wrapper });

    expect(await screen.findByText("Sunita Adhikari")).toBeInTheDocument();
    expect(screen.getByText(/is pending their acceptance/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("shows the recipient accept/decline actions for a transfer addressed to them", async () => {
    mockOrganizationEndpoint({
      pendingOwnershipTransfer: {
        id: "transfer-1",
        toMembershipId: "membership-2",
        toUserId: CURRENT_USER_ID,
        toUserName: "Current User",
        fromUserName: "Bipin Karki",
        removeSenderMembershipOnAccept: false,
        expiresAt: "2026-09-08T00:00:00.000Z",
      },
    });

    render(<CrmPage />, { wrapper });

    expect(
      await screen.findByText(/You've been asked to become the owner of Meridian Apparel Co\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("warns the recipient the sender will be removed when that was requested", async () => {
    mockOrganizationEndpoint({
      pendingOwnershipTransfer: {
        id: "transfer-1",
        toMembershipId: "membership-2",
        toUserId: CURRENT_USER_ID,
        toUserName: "Current User",
        fromUserName: "Bipin Karki",
        removeSenderMembershipOnAccept: true,
        expiresAt: "2026-09-08T00:00:00.000Z",
      },
    });

    render(<CrmPage />, { wrapper });

    expect(
      await screen.findByText(/The current owner will be removed from this organization/),
    ).toBeInTheDocument();
  });

  it("shows a bystander neither the cancel nor the accept/decline actions", async () => {
    mockOrganizationEndpoint({
      pendingOwnershipTransfer: {
        id: "transfer-1",
        toMembershipId: "membership-2",
        toUserId: "some-other-user-id",
        toUserName: "Sunita Adhikari",
        fromUserName: "Bipin Karki",
        removeSenderMembershipOnAccept: false,
        expiresAt: "2026-09-08T00:00:00.000Z",
      },
    });

    render(<CrmPage />, { wrapper });

    expect(await screen.findByText(/Meridian Apparel Co\. · trial/)).toBeInTheDocument();
    expect(screen.queryByText(/pending their acceptance/)).not.toBeInTheDocument();
    expect(screen.queryByText(/You've been asked to become the owner/)).not.toBeInTheDocument();
  });
});
