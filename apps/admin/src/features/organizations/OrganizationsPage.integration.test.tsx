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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const renderOrganizationsPage = () => render(<OrganizationsPage />, { wrapper });

describe("OrganizationsPage", () => {
  it("renders the organization list", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "org-1",
              name: "Outfiqe",
              subdomain: "outfiqe",
              plan: "trial",
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    renderOrganizationsPage();

    expect(await screen.findByText("Outfiqe")).toBeInTheDocument();
    expect(screen.getByText("outfiqe · trial")).toBeInTheDocument();
  });

  it("shows an explicit empty state when there are no organizations", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: [] }),
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
    overrides: Partial<{ ownerExistingOrganizations: { id: string; name: string }[] }> = {},
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
        HttpResponse.json({ success: true, data: [] }),
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
      }),
    );
    await waitFor(() => expect(screen.getByLabelText("Business")).toHaveValue(""));
  });

  it("shows the backend error message when creation fails", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/organizations`, () =>
        HttpResponse.json({ success: true, data: [] }),
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
        HttpResponse.json({ success: true, data: [] }),
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
});
