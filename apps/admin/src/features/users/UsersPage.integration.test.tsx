import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { UsersPage } from "@/features/users/UsersPage";

const API_BASE = "http://localhost:3000/api";

const activeUser = {
  id: "user-1",
  email: "ava@outfiqe.test",
  name: "Ava Martinez",
  handle: "ava",
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  emailVerified: true,
  accountStatus: "ACTIVE",
  suspendedAt: null,
  suspendedBy: null,
  suspensionReason: null,
  suspensionExpiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<UsersPage />, { wrapper });
};

const mockUsersList = (users: unknown[]) => {
  mswServer.use(
    http.get(`${API_BASE}/users`, () =>
      HttpResponse.json({ success: true, message: "ok", data: { items: users, nextCursor: null } }),
    ),
  );
};

describe("UsersPage", () => {
  it("finds a user by search and suspends them with a reason", async () => {
    const user = userEvent.setup();
    mockUsersList([activeUser]);
    mswServer.use(
      http.post(`${API_BASE}/platform/users/user-1/suspend`, () =>
        HttpResponse.json({ success: true, message: "Account suspended.", data: null }),
      ),
    );

    renderPage();
    await user.type(screen.getByPlaceholderText(/search by name/i), "ava");

    await screen.findByText("Ava Martinez");
    await user.click(screen.getByRole("button", { name: "Suspend" }));

    const reasonField = await screen.findByLabelText(/reason \(shown to the user\)/i, undefined, {
      timeout: 5000,
    });
    await user.type(reasonField, "Reported for spam");
    await user.click(screen.getByRole("button", { name: "Confirm suspension" }));

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Suspend Ava Martinez" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("surfaces a server error inline when suspending fails", async () => {
    const user = userEvent.setup();
    mockUsersList([activeUser]);
    mswServer.use(
      http.post(`${API_BASE}/platform/users/user-1/suspend`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "This account is already suspended.",
            code: "ALREADY_SUSPENDED",
          },
          { status: 409 },
        ),
      ),
    );

    renderPage();
    await user.type(screen.getByPlaceholderText(/search by name/i), "ava");

    await screen.findByText("Ava Martinez");
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    const reasonField = await screen.findByLabelText(/reason \(shown to the user\)/i, undefined, {
      timeout: 5000,
    });
    await user.type(reasonField, "Reported for spam");
    await user.click(screen.getByRole("button", { name: "Confirm suspension" }));

    expect(await screen.findByText("This account is already suspended.")).toBeInTheDocument();
  });

  it("hides moderation actions for admin accounts", async () => {
    const user = userEvent.setup();
    mockUsersList([{ ...activeUser, id: "admin-1", name: "Site Admin", role: "ADMIN" }]);

    renderPage();
    await user.type(screen.getByPlaceholderText(/search by name/i), "admin");

    await screen.findByText("Site Admin");
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ban" })).not.toBeInTheDocument();
  });
});
