import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  return router;
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

  it("passes the debounced search term to the API", async () => {
    mockOrganization();
    const seenQueries: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, ({ request }) => {
        seenQueries.push(new URL(request.url).searchParams.get("q"));
        return HttpResponse.json({
          success: true,
          data: { items: [contactRow()], total: 1, hasMore: false },
        });
      }),
    );

    renderContactsPage();
    await screen.findByText("Anisha Gurung");

    await userEvent.type(screen.getByPlaceholderText("Search contacts"), "anisha");

    await waitFor(() => expect(seenQueries).toContain("anisha"));
  });

  it("tells the user when filters match nothing", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json({ success: true, data: { items: [], total: 0, hasMore: false } }),
      ),
    );

    renderContactsPage();

    await userEvent.selectOptions(
      await screen.findByLabelText("Filter by lifecycle stage"),
      "PARTNER",
    );

    expect(await screen.findByText("No contacts match your filters.")).toBeInTheDocument();
  });

  it("opens the create modal from the New contact button", async () => {
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
    await screen.findByText("Anisha Gurung");

    await userEvent.click(screen.getByRole("button", { name: "New contact" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the search and stage in the link", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json({
          success: true,
          data: { items: [contactRow()], total: 1, hasMore: false },
        }),
      ),
    );

    const router = renderContactsPage();
    await screen.findByText("Anisha Gurung");

    await userEvent.selectOptions(screen.getByLabelText("Filter by lifecycle stage"), "CUSTOMER");
    await userEvent.type(screen.getByPlaceholderText("Search contacts"), "anisha");

    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ stage: "CUSTOMER", q: "anisha" }),
    );
  });

  it("opens a contact when its row is clicked", async () => {
    mockOrganization();
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json({
          success: true,
          data: { items: [contactRow()], total: 1, hasMore: false },
        }),
      ),
    );

    const router = renderContactsPage();

    await userEvent.click(await screen.findByRole("cell", { name: "Boutique KTM" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/crm/contacts/c-1"));
  });

  it("links each contact name to its own page", async () => {
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

    expect(await screen.findByRole("link", { name: "Anisha Gurung" })).toHaveAttribute(
      "href",
      "/crm/contacts/c-1",
    );
  });

  it("deletes a contact and shows the error banner when the delete fails", async () => {
    mockOrganization();
    let attempts = 0;
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, () =>
        HttpResponse.json({
          success: true,
          data: { items: [contactRow()], total: 1, hasMore: false },
        }),
      ),
      http.delete(`${API_BASE}/crm/contacts/c-1`, () => {
        attempts += 1;
        return HttpResponse.json(
          { success: false, message: "Cannot delete this contact." },
          { status: 409 },
        );
      }),
    );

    renderContactsPage();
    await screen.findByText("Anisha Gurung");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(attempts).toBe(0);
    const warning = await screen.findByRole("dialog", { name: "Delete this contact?" });
    await userEvent.click(within(warning).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Cannot delete this contact.")).toBeInTheDocument();
    expect(attempts).toBe(1);
  });

  it("pages forward and back through the results", async () => {
    mockOrganization();
    const seenPages: (string | null)[] = [];
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts`, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page");
        seenPages.push(page);
        return HttpResponse.json({
          success: true,
          data: {
            items: [contactRow({ name: page === "2" ? "Page Two Person" : "Anisha Gurung" })],
            total: 40,
            hasMore: page !== "2",
          },
        });
      }),
    );

    renderContactsPage();
    await screen.findByText("Anisha Gurung");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page Two Person")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Anisha Gurung")).toBeInTheDocument();
    expect(seenPages).toContain("2");
  });
});
