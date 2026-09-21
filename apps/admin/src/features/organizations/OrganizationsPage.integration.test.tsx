import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { OrganizationsPage } from "./OrganizationsPage";

const API_BASE = "http://localhost:3000/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const renderOrganizationsPage = () => render(<OrganizationsPage />, { wrapper });

describe("OrganizationsPage", () => {
  it("renders the organization list with linked-brand status", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({
          success: true,
          data: {
            organizations: [
              {
                id: "org-1",
                name: "Outfiqe",
                subdomain: "outfiqe",
                plan: "trial",
                linkedBrandId: null,
                linkedBrandName: null,
                createdAt: "2026-01-01T00:00:00.000Z",
              },
              {
                id: "org-2",
                name: "Meridian Apparel Co.",
                subdomain: "meridian",
                plan: "trial",
                linkedBrandId: "brand-7",
                linkedBrandName: "Kastha Studio",
                createdAt: "2026-01-02T00:00:00.000Z",
              },
            ],
            nextCursor: null,
          },
        }),
      ),
    );

    renderOrganizationsPage();

    expect(await screen.findByText("Outfiqe")).toBeInTheDocument();
    expect(screen.getByText("outfiqe · trial · no linked brand")).toBeInTheDocument();
    expect(screen.getByText("meridian · trial · linked to Kastha Studio")).toBeInTheDocument();
  });

  it("loads the next page of organizations on demand", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        if (!cursor) {
          return HttpResponse.json({
            success: true,
            data: {
              organizations: [
                {
                  id: "org-1",
                  name: "Outfiqe",
                  subdomain: "outfiqe",
                  plan: "trial",
                  linkedBrandId: null,
                  linkedBrandName: null,
                  createdAt: "2026-01-01T00:00:00.000Z",
                },
              ],
              nextCursor: "org-1",
            },
          });
        }
        return HttpResponse.json({
          success: true,
          data: {
            organizations: [
              {
                id: "org-2",
                name: "Meridian Apparel Co.",
                subdomain: "meridian",
                plan: "trial",
                linkedBrandId: null,
                linkedBrandName: null,
                createdAt: "2026-01-02T00:00:00.000Z",
              },
            ],
            nextCursor: null,
          },
        });
      }),
    );

    renderOrganizationsPage();

    expect(await screen.findByText("Outfiqe")).toBeInTheDocument();
    expect(screen.queryByText("Meridian Apparel Co.")).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Meridian Apparel Co.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("shows an explicit empty state when there are no organizations", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
    );

    renderOrganizationsPage();

    expect(await screen.findByText("No organizations yet.")).toBeInTheDocument();
  });

  it("shows an error state when the list fails to load", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/crm/organizations`,
        () =>
          new HttpResponse(
            JSON.stringify({ success: false, message: "Forbidden", code: "FORBIDDEN" }),
            { status: 403 },
          ),
      ),
    );

    renderOrganizationsPage();

    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
  });

  const mockBrandSearch = () => {
    mswServer.use(
      http.get(`${API_BASE}/brands`, () =>
        HttpResponse.json({
          success: true,
          data: { brands: [{ id: "brand-1", name: "Acme", avatarUrl: null }] },
        }),
      ),
    );
  };

  const mockSuggestion = (
    overrides: Partial<{
      ownerExistingOrganizations: { id: string; name: string }[];
      existingOrganizationForBrand: { id: string; name: string } | null;
    }> = {},
  ) => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations/suggest`, () =>
        HttpResponse.json({
          success: true,
          data: {
            brandId: "brand-1",
            brandName: "Acme",
            ownerUserId: "owner-1",
            ownerName: "Ava Martinez",
            suggestedSubdomain: "acme",
            ownerExistingOrganizations: overrides.ownerExistingOrganizations ?? [],
            existingOrganizationForBrand: overrides.existingOrganizationForBrand ?? null,
          },
        }),
      ),
    );
  };

  const selectAcme = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByLabelText("Business"), "Acme");
    await user.click(await screen.findByRole("option", { name: "Acme" }));
    await screen.findByDisplayValue("acme");
  };

  it("creates an organization and clears the form on success", async () => {
    let requestBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
      http.post(`${API_BASE}/crm/organizations`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: "org-2",
              name: "Acme",
              subdomain: "acme",
              plan: "trial",
              linkedBrandId: "brand-1",
              linkedBrandName: "Acme",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          },
          { status: 201 },
        );
      }),
    );
    mockBrandSearch();
    mockSuggestion();

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await selectAcme(user);
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    await waitFor(() =>
      expect(requestBody).toEqual({
        name: "Acme",
        subdomain: "acme",
        targetOwnerUserId: "owner-1",
        linkedBrandId: "brand-1",
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("Business")).toHaveValue(""));
    expect(await screen.findByText("Organization created.")).toBeInTheDocument();
  });

  it("snaps the business field back to the picked name when an uncommitted edit is abandoned", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
    );
    mockBrandSearch();
    mockSuggestion();

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await selectAcme(user);

    const businessField = screen.getByLabelText("Business");
    await user.type(businessField, " Corp");
    expect(businessField).toHaveValue("Acme Corp");

    await user.click(screen.getByLabelText("Subdomain"));
    await waitFor(() => expect(businessField).toHaveValue("Acme"));
  });

  it("shows the backend error message when creation fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
      http.post(
        `${API_BASE}/crm/organizations`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "This subdomain is already in use.",
              code: "SUBDOMAIN_TAKEN",
            }),
            { status: 409 },
          ),
      ),
    );
    mockBrandSearch();
    mockSuggestion();

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await selectAcme(user);
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    expect(await screen.findByText("This subdomain is already in use.")).toBeInTheDocument();
  });

  it("shows the owner's existing organizations instead of hiding them", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
    );
    mockBrandSearch();
    mockSuggestion({ ownerExistingOrganizations: [{ id: "org-9", name: "Daraz-Org" }] });

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await selectAcme(user);

    expect(await screen.findByText(/Ava Martinez already owns/)).toBeInTheDocument();
    expect(screen.getByText(/Daraz-Org/)).toBeInTheDocument();
  });

  it("warns when the picked business is already linked to an organization", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
    );
    mockBrandSearch();
    mockSuggestion({ existingOrganizationForBrand: { id: "org-3", name: "Acme CRM" } });

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await selectAcme(user);

    expect(await screen.findByText(/already linked to the organization/)).toBeInTheDocument();
    expect(screen.getByText(/Acme CRM/)).toBeInTheDocument();
  });

  it("shows inline messages, not a browser popup, and sends nothing for an empty form", async () => {
    let createRequested = false;
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
      http.post(`${API_BASE}/crm/organizations`, () => {
        createRequested = true;
        return HttpResponse.json({ success: true, data: {} }, { status: 201 });
      }),
    );

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    expect(await screen.findByText("Choose a business.")).toBeInTheDocument();
    expect(screen.getByText("Enter a subdomain.")).toBeInTheDocument();
    expect(createRequested).toBe(false);
  });

  it("explains a subdomain with capital letters or a reserved name", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: { organizations: [], nextCursor: null } }),
      ),
    );
    mockBrandSearch();
    mockSuggestion();

    renderOrganizationsPage();
    await screen.findByText("No organizations yet.");

    const user = userEvent.setup();
    await selectAcme(user);
    const subdomainField = screen.getByLabelText("Subdomain");
    await user.clear(subdomainField);
    await user.type(subdomainField, "www");
    await user.click(screen.getByRole("button", { name: "Create organization" }));

    expect(
      await screen.findByText("This subdomain is reserved and can't be used."),
    ).toBeInTheDocument();
  });
});
