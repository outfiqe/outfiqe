import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { MembersSection } from "./MembersSection";

const API_BASE = "http://localhost:3000/api";

const ROLES = [
  { id: "role-admin", name: "Admin" },
  { id: "role-member", name: "Member" },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const renderMembersSection = () => render(<MembersSection />, { wrapper });

describe("MembersSection", () => {
  it("renders the member list, disabling controls on the SUPERADMIN's own row", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/members`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "membership-1",
              userId: "user-1",
              userName: "Ada Lovelace",
              userEmail: "ada@outfiqe.test",
              roleId: "role-admin",
              roleName: "Admin",
              status: "ACTIVE",
              isSuperAdmin: true,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    renderMembersSection();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("SUPERADMIN")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });

  it("shows an explicit empty state when there are no members", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/members`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderMembersSection();

    expect(await screen.findByText("No CRM members yet.")).toBeInTheDocument();
  });

  it("shows an error state when the members list fails to load", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(
        `${API_BASE}/crm/members`,
        () =>
          new HttpResponse(
            JSON.stringify({ success: false, message: "Forbidden", code: "FORBIDDEN" }),
            { status: 403 },
          ),
      ),
    );

    renderMembersSection();

    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
  });

  it("deactivates and reactivates a non-SUPERADMIN member", async () => {
    let lastPatchBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/members`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "membership-2",
              userId: "user-2",
              userName: "Grace Hopper",
              userEmail: "grace@outfiqe.test",
              roleId: "role-member",
              roleName: "Member",
              status: "ACTIVE",
              isSuperAdmin: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
      http.patch(`${API_BASE}/crm/members/membership-2`, async ({ request }) => {
        lastPatchBody = await request.json();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderMembersSection();
    await screen.findByText("Grace Hopper");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(lastPatchBody).toEqual({ status: "DEACTIVATED" }));
  });
});
