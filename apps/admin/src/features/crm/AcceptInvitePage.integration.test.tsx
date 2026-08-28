import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcceptInvitePage } from "./AcceptInvitePage";

const API_BASE = "http://localhost:3000/api";

const updateUser = vi.fn();

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ updateUser }),
}));

const refreshedUser = {
  id: "user-1",
  name: "Daraz Org Admin",
  email: "daraz-admin@yopmail.com",
  avatarUrl: null,
  role: "ADMIN",
  hasPlatformAccess: false,
};

const renderAcceptInvitePage = (initialPath: string) => {
  const rootRoute = createRootRoute();
  const acceptRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/_authenticated/crm/invites/accept",
    validateSearch: (search: Record<string, unknown>) => ({
      token: typeof search.token === "string" ? search.token : "",
    }),
    component: AcceptInvitePage,
  });
  const routeTree = rootRoute.addChildren([acceptRoute]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
};

describe("AcceptInvitePage", () => {
  beforeEach(() => updateUser.mockClear());

  it("shows an error immediately when the link has no token", async () => {
    renderAcceptInvitePage("/_authenticated/crm/invites/accept");

    expect(await screen.findByText("This invite link is missing a token.")).toBeInTheDocument();
  });

  it("accepts a valid token and offers a way into the CRM", async () => {
    mswServer.use(
      http.post(`${API_BASE}/crm/invites/accept`, () =>
        HttpResponse.json({ success: true, data: { id: "membership-1" } }),
      ),
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, data: refreshedUser }),
      ),
    );

    renderAcceptInvitePage("/_authenticated/crm/invites/accept?token=raw-token-value");

    expect(await screen.findByText(/You now have CRM access/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to CRM" })).toBeInTheDocument();
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith(refreshedUser));
  });

  it("shows the server's error message for an invalid token", async () => {
    mswServer.use(
      http.post(
        `${API_BASE}/crm/invites/accept`,
        () =>
          new HttpResponse(
            JSON.stringify({
              success: false,
              message: "This invite link has expired or was already used.",
              code: "INVITE_INVALID",
            }),
            { status: 409 },
          ),
      ),
    );

    renderAcceptInvitePage("/_authenticated/crm/invites/accept?token=stale-token");

    expect(
      await screen.findByText("This invite link has expired or was already used."),
    ).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
