import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { mswServer } from "@test/integration/msw/server";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ApiClientModule from "@/lib/apiClient";

import { CrmInviteRegisterPage } from "./CrmInviteRegisterPage";

const API_BASE = "http://localhost:3000/api";

const setAccessToken = vi.fn();
const setSession = vi.fn();

vi.mock("@/lib/apiClient", async () => {
  const actual = await vi.importActual<typeof ApiClientModule>("@/lib/apiClient");
  return { ...actual, setAccessToken: (token: string | null) => setAccessToken(token) };
});

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => ({ setSession }),
}));

const validInvite = {
  email: "new-hire@yopmail.com",
  organizationName: "Meridian Apparel",
  roleName: "Support agent",
  requiresRegistration: true,
};

const renderPage = (initialPath: string) => {
  const rootRoute = createRootRoute();
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/crm/invites/register",
    validateSearch: (search: Record<string, unknown>) => ({
      token: typeof search.token === "string" ? search.token : "",
    }),
    component: CrmInviteRegisterPage,
  });
  const crmRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/crm",
    component: () => <div>CRM home</div>,
  });
  const routeTree = rootRoute.addChildren([registerRoute, crmRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
};

describe("CrmInviteRegisterPage", () => {
  beforeEach(() => {
    setAccessToken.mockClear();
    setSession.mockClear();
  });

  it("shows an error when the link has no token", async () => {
    renderPage("/crm/invites/register");

    expect(await screen.findByText("This invite link is missing a token.")).toBeInTheDocument();
  });

  it("registers from a valid invite and lands in the CRM", async () => {
    const registeredUser = {
      id: "user-1",
      name: "New Hire",
      email: validInvite.email,
      avatarUrl: null,
      role: "ADMIN",
      hasPlatformAccess: false,
      isCoFounder: false,
      hiddenPlatformNavKeys: [],
    };
    mswServer.use(
      http.get(`${API_BASE}/auth/invite/crm`, () =>
        HttpResponse.json({ success: true, data: validInvite }),
      ),
      http.post(`${API_BASE}/auth/register/crm-invite`, () =>
        HttpResponse.json({
          success: true,
          data: { accessToken: "fresh-access-token", user: registeredUser },
        }),
      ),
    );

    renderPage("/crm/invites/register?token=raw-token-value");

    expect(await screen.findByText(/Join Meridian Apparel/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Hire" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "9812345678" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct-horse-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account & join" }));

    await waitFor(() => expect(setAccessToken).toHaveBeenCalledWith("fresh-access-token"));
    expect(setSession).toHaveBeenCalledWith(registeredUser);
    expect(await screen.findByText("CRM home")).toBeInTheDocument();
  });

  it("validates the form before calling the API", async () => {
    mswServer.use(
      http.get(`${API_BASE}/auth/invite/crm`, () =>
        HttpResponse.json({ success: true, data: validInvite }),
      ),
    );

    renderPage("/crm/invites/register?token=raw-token-value");
    await screen.findByText(/Join Meridian Apparel/);

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "New Hire" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct-horse-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account & join" }));
    expect(
      await screen.findByText("Enter a valid Nepali phone number starting with 98."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "9812345678" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account & join" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();

    expect(setAccessToken).not.toHaveBeenCalled();
  });

  it("shows the server's error message for an invalid invite", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/auth/invite/crm`,
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

    renderPage("/crm/invites/register?token=stale-token");

    expect(
      await screen.findByText("This invite link has expired or was already used."),
    ).toBeInTheDocument();
  });
});
