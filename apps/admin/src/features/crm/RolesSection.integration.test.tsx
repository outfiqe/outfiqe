import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { RolesSection } from "./RolesSection";

const API_BASE = "http://localhost:3000/api";

const PERMISSIONS = [
  { key: "tickets:read", label: "View tickets", group: "Support" },
  { key: "tickets:write", label: "Edit tickets", group: "Support" },
  { key: "reports:read", label: "View reports", group: "Activities, tasks & reports" },
  { key: "platform:access", label: "Access platform", group: "Platform" },
];

const ROLES = [
  {
    id: "role-admin",
    name: "Admin",
    isBuiltIn: true,
    permissionKeys: ["tickets:read", "tickets:write", "reports:read"],
  },
  { id: "role-support", name: "Support agent", isBuiltIn: false, permissionKeys: ["tickets:read"] },
];

const mockLists = () => {
  mswServer.use(
    http.get(`${API_BASE}/crm/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
    http.get(`${API_BASE}/crm/permissions`, () =>
      HttpResponse.json({ success: true, data: PERMISSIONS }),
    ),
  );
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const renderRolesSection = (
  overrides: { viewerIsSuperAdmin?: boolean; viewerPermissionKeys?: string[] } = {},
) =>
  render(
    <RolesSection
      organizationName="Meridian"
      viewerIsSuperAdmin={overrides.viewerIsSuperAdmin ?? false}
      viewerPermissionKeys={overrides.viewerPermissionKeys ?? []}
    />,
    { wrapper },
  );

describe("RolesSection", () => {
  it("lists roles and only offers edit/delete on custom roles to a manager", async () => {
    mockLists();
    renderRolesSection({ viewerPermissionKeys: ["roles:read", "roles:manage"] });

    expect(await screen.findByText("Support agent")).toBeInTheDocument();
    expect(screen.getByText("Built-in")).toBeInTheDocument();

    const adminRow = screen.getByText("Admin").closest("div.rounded-xl") as HTMLElement;
    expect(within(adminRow).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    const supportRow = screen.getByText("Support agent").closest("div.rounded-xl") as HTMLElement;
    expect(within(supportRow).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(supportRow).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides every mutating control from a viewer without roles:manage", async () => {
    mockLists();
    renderRolesSection({ viewerPermissionKeys: ["roles:read"] });

    await screen.findByText("Support agent");
    expect(screen.queryByRole("button", { name: "New role" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("omits the withheld platform permission from the matrix and sends the picked subset", async () => {
    mockLists();
    let createdBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/crm/roles`, async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: "role-new",
              name: "Analyst",
              isBuiltIn: false,
              permissionKeys: ["reports:read"],
            },
          },
          { status: 201 },
        );
      }),
    );

    renderRolesSection({ viewerPermissionKeys: ["roles:read", "roles:manage"] });
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "New role" }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).queryByText("Access platform")).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Role name"), "Analyst");
    await user.click(within(dialog).getByRole("checkbox", { name: "View reports" }));
    await user.click(within(dialog).getByRole("button", { name: "Create role" }));

    await waitFor(() =>
      expect(createdBody).toEqual({ name: "Analyst", permissionKeys: ["reports:read"] }),
    );
  });

  it("pre-fills the modal when editing and patches the changed permission set", async () => {
    mockLists();
    let patchedBody: unknown;
    mswServer.use(
      http.patch(`${API_BASE}/crm/roles/role-support`, async ({ request }) => {
        patchedBody = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            id: "role-support",
            name: "Support agent",
            isBuiltIn: false,
            permissionKeys: ["tickets:read", "tickets:write"],
          },
        });
      }),
    );

    renderRolesSection({ viewerPermissionKeys: ["roles:read", "roles:manage"] });
    const user = userEvent.setup({ delay: null });

    const supportRow = (await screen.findByText("Support agent")).closest(
      "div.rounded-xl",
    ) as HTMLElement;
    await user.click(within(supportRow).getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Role name")).toHaveValue("Support agent");
    expect(within(dialog).getByRole("checkbox", { name: "View tickets" })).toBeChecked();

    await user.click(within(dialog).getByRole("checkbox", { name: "Edit tickets" }));
    await user.click(within(dialog).getByRole("button", { name: "Save role" }));

    await waitFor(() =>
      expect(patchedBody).toEqual({
        name: "Support agent",
        permissionKeys: ["tickets:read", "tickets:write"],
      }),
    );
  });

  it("surfaces the API message when a role can't be deleted because it's in use", async () => {
    mockLists();
    mswServer.use(
      http.delete(
        `${API_BASE}/crm/roles/role-support`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "Reassign every member on this role before deleting it.",
              code: "ROLE_IN_USE",
            }),
            { status: 409 },
          ),
      ),
    );

    renderRolesSection({ viewerPermissionKeys: ["roles:read", "roles:manage"] });
    const user = userEvent.setup({ delay: null });

    const supportRow = (await screen.findByText("Support agent")).closest(
      "div.rounded-xl",
    ) as HTMLElement;
    await user.click(within(supportRow).getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete role" }));

    expect(
      await within(dialog).findByText("Reassign every member on this role before deleting it."),
    ).toBeInTheDocument();
  });

  it("renames the organization for a viewer with org:update", async () => {
    mockLists();
    let renameBody: unknown;
    mswServer.use(
      http.patch(`${API_BASE}/crm/organization`, async ({ request }) => {
        renameBody = await request.json();
        return HttpResponse.json({ success: true, data: null });
      }),
    );

    renderRolesSection({ viewerPermissionKeys: ["roles:read", "org:update"] });
    const user = userEvent.setup({ delay: null });

    const nameField = await screen.findByLabelText("Organization name");
    await user.clear(nameField);
    await user.type(nameField, "Meridian Apparel");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(renameBody).toEqual({ name: "Meridian Apparel" }));
  });
});
