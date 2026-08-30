import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { InviteSection } from "./InviteSection";

const API_BASE = "http://localhost:3000/api";

const ROLES = [
  { id: "role-admin", name: "Admin", isBuiltIn: true, permissionKeys: ["members:read"] },
  { id: "role-member", name: "Member", isBuiltIn: true, permissionKeys: [] },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const renderInviteSection = () => render(<InviteSection />, { wrapper });

describe("InviteSection", () => {
  it("renders pending invites", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/invites`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "invite-1",
              email: "new-hire@outfiqe.test",
              roleId: "role-member",
              roleName: "Member",
              status: "PENDING",
              createdAt: "2026-01-01T00:00:00.000Z",
              expiresAt: "2026-01-08T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    renderInviteSection();

    expect(await screen.findByText("new-hire@outfiqe.test")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
  });

  it("shows an explicit empty state when there are no pending invites", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/invites`, () => HttpResponse.json({ success: true, data: [] })),
    );

    renderInviteSection();

    expect(await screen.findByText("No invites yet.")).toBeInTheDocument();
  });

  it("shows an error state when the invites list fails to load", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(
        `${API_BASE}/crm/invites`,
        () =>
          new HttpResponse(
            JSON.stringify({ success: false, message: "Forbidden", code: "FORBIDDEN" }),
            { status: 403 },
          ),
      ),
    );

    renderInviteSection();

    await waitFor(() => expect(screen.getByText("Forbidden")).toBeInTheDocument());
  });

  it("sends an invite and clears the form on success", async () => {
    let requestBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/invites`, () => HttpResponse.json({ success: true, data: [] })),
      http.post(`${API_BASE}/crm/invites`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ success: true, data: null }, { status: 201 });
      }),
    );

    renderInviteSection();
    await screen.findByText("No invites yet.");

    const user = userEvent.setup({ delay: null });
    await user.type(screen.getByLabelText("Email"), "colleague@outfiqe.test");
    await user.selectOptions(screen.getByLabelText("Role"), "role-member");
    await user.click(screen.getByRole("button", { name: "Send invite" }));

    await waitFor(() =>
      expect(requestBody).toEqual({ email: "colleague@outfiqe.test", roleId: "role-member" }),
    );
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue(""));
  });
});
