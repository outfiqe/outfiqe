import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { MembersSection } from "./MembersSection";

const API_BASE = "http://localhost:3000/api";
const CURRENT_USER_ID = "current-user-id";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    state: { status: "signed-in", user: { id: CURRENT_USER_ID } },
  }),
}));

const ROLES = [
  { id: "role-admin", name: "Admin", isBuiltIn: true, permissionKeys: ["members:read"] },
  { id: "role-member", name: "Member", isBuiltIn: true, permissionKeys: [] },
];

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const renderMembersSection = (
  overrides: {
    viewerIsSuperAdmin?: boolean;
    viewerPermissionKeys?: string[];
    hasPendingOwnershipTransfer?: boolean;
  } = {},
) =>
  render(
    <MembersSection
      viewerIsSuperAdmin={overrides.viewerIsSuperAdmin ?? false}
      viewerPermissionKeys={overrides.viewerPermissionKeys ?? ["members:read"]}
      hasPendingOwnershipTransfer={overrides.hasPendingOwnershipTransfer ?? false}
    />,
    { wrapper },
  );

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

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(lastPatchBody).toEqual({ status: "DEACTIVATED" }));
  });

  it("disables the role and access controls on the viewer's own row", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
      http.get(`${API_BASE}/crm/members`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "membership-self",
              userId: CURRENT_USER_ID,
              userName: "Current Admin",
              userEmail: "me@outfiqe.test",
              roleId: "role-admin",
              roleName: "Admin",
              status: "ACTIVE",
              isSuperAdmin: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    renderMembersSection();

    expect(await screen.findByText("Current Admin")).toBeInTheDocument();
    expect(screen.getByText(/change your own role or access/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });

  it("asks for confirmation before changing another member's role, then applies it", async () => {
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

    const user = userEvent.setup({ delay: null });
    await user.selectOptions(screen.getByRole("combobox"), "role-admin");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Change Grace Hopper's role to Admin/i)).toBeInTheDocument();
    expect(lastPatchBody).toBeUndefined();

    await user.click(within(dialog).getByRole("button", { name: "Change role" }));

    await waitFor(() => expect(lastPatchBody).toEqual({ roleId: "role-admin" }));
  });

  it("does not change the role when the confirmation is cancelled", async () => {
    let patchCalled = false;
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
      http.patch(`${API_BASE}/crm/members/membership-2`, () => {
        patchCalled = true;
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderMembersSection();
    await screen.findByText("Grace Hopper");

    const user = userEvent.setup({ delay: null });
    await user.selectOptions(screen.getByRole("combobox"), "role-admin");

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(patchCalled).toBe(false);
    expect(screen.getByRole("combobox")).toHaveValue("role-member");
  });

  it("hides a role the viewer can't grant from the picker, but still shows the member's current role", async () => {
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
    );

    renderMembersSection({ viewerPermissionKeys: [] });
    await screen.findByText("Grace Hopper");

    const combobox = screen.getByRole("combobox");
    expect(within(combobox).getByRole("option", { name: "Member" })).toBeInTheDocument();
    expect(within(combobox).queryByRole("option", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows a transfer ownership button for an eligible member when the viewer is the SUPERADMIN", async () => {
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
    );

    renderMembersSection({ viewerIsSuperAdmin: true });

    expect(await screen.findByRole("button", { name: "Transfer ownership" })).toBeInTheDocument();
  });

  it("hides the transfer ownership button when a transfer is already pending", async () => {
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
    );

    renderMembersSection({ viewerIsSuperAdmin: true, hasPendingOwnershipTransfer: true });

    await screen.findByText("Grace Hopper");
    expect(screen.queryByRole("button", { name: "Transfer ownership" })).not.toBeInTheDocument();
  });

  it("requests an ownership transfer after confirming in the modal", async () => {
    let lastTransferBody: unknown;
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
      http.post(`${API_BASE}/crm/ownership-transfer`, async ({ request }) => {
        lastTransferBody = await request.json();
        return HttpResponse.json({ success: true, data: null }, { status: 201 });
      }),
    );

    renderMembersSection({ viewerIsSuperAdmin: true });

    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: "Transfer ownership" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Transfer ownership" }));

    await waitFor(() =>
      expect(lastTransferBody).toEqual({
        toMembershipId: "membership-2",
        removeSenderMembership: false,
      }),
    );
  });

  it("requests removal of the sender's own membership when that checkbox is checked", async () => {
    let lastTransferBody: unknown;
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
      http.post(`${API_BASE}/crm/ownership-transfer`, async ({ request }) => {
        lastTransferBody = await request.json();
        return HttpResponse.json({ success: true, data: null }, { status: 201 });
      }),
    );

    renderMembersSection({ viewerIsSuperAdmin: true });

    const user = userEvent.setup({ delay: null });
    await user.click(await screen.findByRole("button", { name: "Transfer ownership" }));

    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("checkbox", { name: "Remove my own access after this transfer" }),
    );
    await user.click(within(dialog).getByRole("button", { name: "Transfer ownership" }));

    await waitFor(() =>
      expect(lastTransferBody).toEqual({
        toMembershipId: "membership-2",
        removeSenderMembership: true,
      }),
    );
  });
});
