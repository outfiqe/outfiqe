import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PlatformTeamSection } from "./PlatformTeamSection";

const API_BASE = "http://localhost:3000/api";
const CURRENT_USER_ID = "current-user-id";

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({
    state: { status: "signed-in", user: { id: CURRENT_USER_ID } },
  }),
}));

const ROLES = [
  { id: "role-admin", name: "Admin", isBuiltIn: true, permissionKeys: ["platform:team:manage"] },
  { id: "role-finance", name: "Finance only", isBuiltIn: false, permissionKeys: [] },
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

describe("PlatformTeamSection", () => {
  it("shows an explicit empty state when there is no staff", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/roles`, () =>
        HttpResponse.json({ success: true, data: ROLES }),
      ),
      http.get(`${API_BASE}/platform/team`, () => HttpResponse.json({ success: true, data: [] })),
    );

    render(<PlatformTeamSection />, { wrapper });

    expect(await screen.findByText("No platform staff yet.")).toBeInTheDocument();
  });

  it("disables the role and access controls on the viewer's own row", async () => {
    mswServer.use(
      http.get(`${API_BASE}/platform/roles`, () =>
        HttpResponse.json({ success: true, data: ROLES }),
      ),
      http.get(`${API_BASE}/platform/team`, () =>
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

    render(<PlatformTeamSection />, { wrapper });

    expect(await screen.findByText("Current Admin")).toBeInTheDocument();
    expect(screen.getByText(/change your own role or access/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeDisabled();
  });

  it("asks for confirmation before changing another member's role, then applies it", async () => {
    let lastPatchBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/platform/roles`, () =>
        HttpResponse.json({ success: true, data: ROLES }),
      ),
      http.get(`${API_BASE}/platform/team`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "membership-2",
              userId: "user-2",
              userName: "Grace Hopper",
              userEmail: "grace@outfiqe.test",
              roleId: "role-finance",
              roleName: "Finance only",
              status: "ACTIVE",
              isSuperAdmin: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
      http.patch(`${API_BASE}/platform/team/membership-2`, async ({ request }) => {
        lastPatchBody = await request.json();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    render(<PlatformTeamSection />, { wrapper });
    await screen.findByText("Grace Hopper");

    const user = userEvent.setup({ delay: null });
    await user.selectOptions(screen.getByRole("combobox"), "role-admin");

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/Change Grace Hopper's platform role to Admin/i),
    ).toBeInTheDocument();
    expect(lastPatchBody).toBeUndefined();

    await user.click(within(dialog).getByRole("button", { name: "Change role" }));

    await waitFor(() => expect(lastPatchBody).toEqual({ roleId: "role-admin" }));
  });

  it("deactivates a non-SUPERADMIN member", async () => {
    let lastPatchBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/platform/roles`, () =>
        HttpResponse.json({ success: true, data: ROLES }),
      ),
      http.get(`${API_BASE}/platform/team`, () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              id: "membership-2",
              userId: "user-2",
              userName: "Grace Hopper",
              userEmail: "grace@outfiqe.test",
              roleId: "role-finance",
              roleName: "Finance only",
              status: "ACTIVE",
              isSuperAdmin: false,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        }),
      ),
      http.patch(`${API_BASE}/platform/team/membership-2`, async ({ request }) => {
        lastPatchBody = await request.json();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    render(<PlatformTeamSection />, { wrapper });
    await screen.findByText("Grace Hopper");

    const user = userEvent.setup({ delay: null });
    await user.click(screen.getByRole("button", { name: "Deactivate" }));

    await waitFor(() => expect(lastPatchBody).toEqual({ status: "DEACTIVATED" }));
  });
});
