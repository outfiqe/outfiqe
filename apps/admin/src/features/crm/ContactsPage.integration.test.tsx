import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ContactsPage } from "./ContactsPage";

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
          viewerPermissionKeys: ["contacts:read", "contacts:write", "contacts:delete"],
          pendingOwnershipTransfer: null,
          advancedFeaturesEnabled: true,
        },
      }),
    ),
    http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
  );
};

const contactRow = (overrides: Record<string, unknown> = {}) => ({
  id: "c-1",
  organizationId: "org-1",
  name: "Anisha Gurung",
  email: "anisha@boutique.test",
  phone: null,
  company: "Boutique KTM",
  jobTitle: null,
  lifecycleStage: "QUALIFIED",
  source: null,
  tags: [],
  notes: null,
  linkedUserId: null,
  ownerMembershipId: null,
  ownerName: null,
  linkedUserName: null,
  linkedUserHandle: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

const renderContactsPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({ component: ContactsPage });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

describe("ContactsPage", () => {
  it("renders the contact table", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json({
          success: true,
          data: { items: [contactRow()], total: 1, hasMore: false },
        }),
      ),
    );

    renderContactsPage();

    expect(await screen.findByText("Anisha Gurung")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Boutique KTM" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Qualified" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no contacts", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json({ success: true, data: { items: [], total: 0, hasMore: false } }),
      ),
    );

    renderContactsPage();

    expect(await screen.findByText(/No contacts yet/i)).toBeInTheDocument();
  });

  it("passes the lifecycle-stage filter to the API", async () => {
    mockOrganization();
    const seenStages: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, ({ request }) => {
        seenStages.push(new URL(request.url).searchParams.get("lifecycleStage"));
        return HttpResponse.json({
          success: true,
          data: { items: [contactRow()], total: 1, hasMore: false },
        });
      }),
    );

    renderContactsPage();
    await screen.findByText("Anisha Gurung");

    await userEvent.selectOptions(screen.getByLabelText("Filter by lifecycle stage"), "CUSTOMER");

    await waitFor(() => expect(seenStages).toContain("CUSTOMER"));
  });
});
