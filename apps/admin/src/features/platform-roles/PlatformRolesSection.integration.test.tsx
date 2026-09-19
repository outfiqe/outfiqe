import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { PlatformRolesSection } from "./PlatformRolesSection";

const API_BASE = "http://localhost:3000/api";

const PERMISSIONS = [
  {
    key: "platform:withdraw:manage",
    label: "Approve, reject, and pay out withdrawal requests",
    group: "Finance",
  },
  { key: "platform:coupons:manage", label: "Create and manage platform coupons", group: "Finance" },
  { key: "platform:support:read", label: "Read support requests", group: "Support" },
];

const ROLES = [
  {
    id: "role-admin",
    name: "Admin",
    isBuiltIn: true,
    permissionKeys: [
      "platform:withdraw:manage",
      "platform:coupons:manage",
      "platform:support:read",
    ],
  },
  {
    id: "role-finance",
    name: "Finance only",
    isBuiltIn: false,
    permissionKeys: ["platform:withdraw:manage"],
  },
];

const mockLists = () => {
  mswServer.use(
    http.get(`${API_BASE}/platform/roles`, () => HttpResponse.json({ success: true, data: ROLES })),
    http.get(`${API_BASE}/platform/permissions`, () =>
      HttpResponse.json({ success: true, data: PERMISSIONS }),
    ),
  );
};

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("PlatformRolesSection", () => {
  it("lists roles and only offers edit/delete on custom roles", async () => {
    mockLists();
    render(<PlatformRolesSection />, { wrapper });

    expect(await screen.findByText("Finance only")).toBeInTheDocument();
    expect(screen.getByText("Built-in")).toBeInTheDocument();

    const adminRow = screen.getByText("Admin").closest("div.rounded-xl") as HTMLElement;
    expect(within(adminRow).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    const financeRow = screen.getByText("Finance only").closest("div.rounded-xl") as HTMLElement;
    expect(within(financeRow).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(financeRow).getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("creates a role from the full platform permission catalog", async () => {
    mockLists();
    let createdBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/platform/roles`, async ({ request }) => {
        createdBody = await request.json();
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: "role-new",
              name: "Support only",
              isBuiltIn: false,
              permissionKeys: ["platform:support:read"],
            },
          },
          { status: 201 },
        );
      }),
    );

    render(<PlatformRolesSection />, { wrapper });
    const user = userEvent.setup({ delay: null });

    await user.click(await screen.findByRole("button", { name: "New role" }));
    const dialog = screen.getByRole("dialog");

    await user.type(within(dialog).getByLabelText("Role name"), "Support only");
    await user.click(within(dialog).getByRole("checkbox", { name: "Read support requests" }));
    await user.click(within(dialog).getByRole("button", { name: "Create role" }));

    await waitFor(() =>
      expect(createdBody).toEqual({
        name: "Support only",
        permissionKeys: ["platform:support:read"],
      }),
    );
  });

  it("surfaces the API message when a role can't be deleted because it's in use", async () => {
    mockLists();
    mswServer.use(
      http.delete(
        `${API_BASE}/platform/roles/role-finance`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "Reassign every member and pending invite off this role before deleting it.",
              code: "ROLE_IN_USE",
            }),
            { status: 409 },
          ),
      ),
    );

    render(<PlatformRolesSection />, { wrapper });
    const user = userEvent.setup({ delay: null });

    const financeRow = (await screen.findByText("Finance only")).closest(
      "div.rounded-xl",
    ) as HTMLElement;
    await user.click(within(financeRow).getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete role" }));

    expect(
      await within(dialog).findByText(
        "Reassign every member and pending invite off this role before deleting it.",
      ),
    ).toBeInTheDocument();
  });
});
