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

import { ContactDetailPage } from "./ContactDetailPage";

const API_BASE = "http://localhost:3000/api";
type ViewerAccess = { viewerIsSuperAdmin: boolean; viewerPermissionKeys: string[] };

const FULL_ACCESS: ViewerAccess = { viewerIsSuperAdmin: true, viewerPermissionKeys: [] };
const READ_ONLY_ACCESS = {
  viewerIsSuperAdmin: false,
  viewerPermissionKeys: ["contacts:read"],
};

const CONTACT = {
  id: "c-1",
  organizationId: "o-1",
  name: "Anisha Gurung",
  email: "anisha@boutique.test",
  phone: "+977 9800000000",
  company: "Boutique KTM",
  jobTitle: "Buyer",
  lifecycleStage: "QUALIFIED",
  source: "Trade fair",
  tags: ["wholesale"],
  notes: "Prefers calls in the morning.",
  linkedUserId: "u-1",
  ownerMembershipId: "m-1",
  ownerName: "Bipin Karki",
  linkedUserName: "Anisha",
  linkedUserHandle: "anisha",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

const CONNECTIONS = {
  people: [{ userId: "u-1", name: "Anisha", handle: "anisha", avatarUrl: null, role: "customer" }],
  contacts: [],
  deals: [{ id: "d-1", title: "Spring collab", value: 5000, status: "OPEN", stageName: "Lead" }],
  tickets: [],
  tasks: [],
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

const mockContactPage = (viewer = FULL_ACCESS, contact: Record<string, unknown> = CONTACT) =>
  mswServer.use(
    organizationFor(viewer),
    http.get(`${API_BASE}/crm/contacts/c-1`, () =>
      HttpResponse.json({ success: true, data: contact }),
    ),
    http.get(`${API_BASE}/crm/contacts`, () =>
      HttpResponse.json({ success: true, data: { items: [], total: 0, hasMore: false } }),
    ),
    http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
    http.get(`${API_BASE}/crm/timeline`, () =>
      HttpResponse.json({ success: true, data: { entries: [], partial: false } }),
    ),
    http.get(`${API_BASE}/crm/connections`, () =>
      HttpResponse.json({ success: true, data: CONNECTIONS }),
    ),
  );

const renderDetailPage = (initialPath: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const detailRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/contacts/$contactId",
    component: ContactDetailPage,
  });
  const listRoute = createRoute({ getParentRoute: () => rootRoute, path: "/crm/contacts" });
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

const CONTACT_PATH = "/_authenticated/crm/contacts/c-1";

describe("ContactDetailPage", () => {
  it("shows how to reach the contact and what the team knows", async () => {
    mockContactPage();
    renderDetailPage(CONTACT_PATH);

    expect(await screen.findByRole("heading", { name: "Anisha Gurung" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "anisha@boutique.test" })).toHaveAttribute(
      "href",
      "mailto:anisha@boutique.test",
    );
    expect(screen.getByRole("link", { name: "+977 9800000000" })).toHaveAttribute(
      "href",
      "tel:+977 9800000000",
    );
    expect(screen.getByText("Anisha (@anisha)")).toBeInTheDocument();
    expect(screen.getByText("Prefers calls in the morning.")).toBeInTheDocument();
    expect(screen.getByText("wholesale")).toBeInTheDocument();
  });

  it("links to the account and work connected to the contact", async () => {
    mockContactPage();
    renderDetailPage(CONTACT_PATH);

    expect(await screen.findByRole("link", { name: /View customer/ })).toHaveAttribute(
      "href",
      "/crm/customers/u-1",
    );
    expect(screen.getByRole("link", { name: /Spring collab/ })).toHaveAttribute(
      "href",
      "/crm/pipeline/d-1",
    );
    expect(await screen.findByLabelText("Activity note")).toBeInTheDocument();
  });

  it("says what is missing on a partly filled contact", async () => {
    mockContactPage(FULL_ACCESS, {
      ...CONTACT,
      email: null,
      phone: null,
      company: null,
      jobTitle: null,
      source: null,
      tags: [],
      notes: null,
      ownerName: null,
      linkedUserName: null,
      linkedUserHandle: null,
    });
    renderDetailPage(CONTACT_PATH);

    expect(await screen.findAllByText("Not added")).toHaveLength(5);
    expect(screen.getByText("No notes yet.")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument();
  });

  it("opens the edit form with the contact filled in", async () => {
    mockContactPage();
    renderDetailPage(CONTACT_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    expect(await screen.findByDisplayValue("Anisha Gurung")).toBeInTheDocument();
  });

  it("deletes after the warning and returns to the contact list", async () => {
    mockContactPage();
    let deleteCount = 0;
    mswServer.use(
      http.delete(`${API_BASE}/crm/contacts/c-1`, () => {
        deleteCount += 1;
        return HttpResponse.json({ success: true, data: null });
      }),
    );
    const router = renderDetailPage(CONTACT_PATH);
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(deleteCount).toBe(0);
    const warning = await screen.findByRole("dialog", { name: "Delete this contact?" });
    await user.click(within(warning).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/crm/contacts"));
    expect(deleteCount).toBe(1);
  });

  it("hides Edit and Delete for a viewer who can only read", async () => {
    mockContactPage(READ_ONLY_ACCESS);
    renderDetailPage(CONTACT_PATH);

    expect(await screen.findByRole("heading", { name: "Anisha Gurung" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("shows a clear message when the contact doesn't exist", async () => {
    mockContactPage();
    mswServer.use(
      http.get(`${API_BASE}/crm/contacts/c-1`, () =>
        HttpResponse.json({ success: false, message: "Contact not found." }, { status: 404 }),
      ),
    );
    renderDetailPage(CONTACT_PATH);

    expect(await screen.findByText("Contact not found.")).toBeInTheDocument();
  });
});
