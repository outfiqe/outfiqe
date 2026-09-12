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

import { RegisterInvitePage } from "./RegisterInvitePage";

const API_BASE = "http://localhost:3000/api";

const setAccessToken = vi.fn();
const setSession = vi.fn();

vi.mock("@/lib/apiClient", async () => {
  const actual = await vi.importActual<typeof ApiClientModule>("@/lib/apiClient");
  return { ...actual, setAccessToken: (token: string | null) => setAccessToken(token) };
});

vi.mock("./AuthContext", () => ({
  useAuth: () => ({ state: { status: "signed-out", reason: "user-signed-out" }, setSession }),
}));

const validInvite = { email: "new-admin@yopmail.com", name: "New Admin" };

const renderPage = (initialPath: string) => {
  const rootRoute = createRootRoute();
  const registerRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/register",
    validateSearch: (search: Record<string, unknown>) => ({
      token: typeof search.token === "string" ? search.token : "",
    }),
    component: RegisterInvitePage,
  });
  const homeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <div>Admin home</div>,
  });
  const routeTree = rootRoute.addChildren([registerRoute, homeRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  render(<RouterProvider router={router} />);
};

describe("RegisterInvitePage", () => {
  beforeEach(() => {
    setAccessToken.mockClear();
    setSession.mockClear();
  });

  it("shows an error when the link has no token", async () => {
    renderPage("/register");

    expect(await screen.findByText("This invite link is missing a token.")).toBeInTheDocument();
  });

  it("signs the new admin in and lands on the home page after registering", async () => {
    const registeredUser = {
      id: "user-1",
      name: "New Admin",
      email: validInvite.email,
      avatarUrl: null,
      role: "ADMIN",
      hasPlatformAccess: true,
      isCoFounder: false,
      hiddenPlatformNavKeys: [],
    };
    mswServer.use(
      http.get(`${API_BASE}/auth/invite/admin`, () =>
        HttpResponse.json({ success: true, data: validInvite }),
      ),
      http.post(`${API_BASE}/auth/register/admin`, () =>
        HttpResponse.json({
          success: true,
          data: { accessToken: "fresh-access-token", user: registeredUser },
        }),
      ),
    );

    renderPage("/register?token=raw-token-value");

    expect(await screen.findByText(validInvite.email)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "9812345678" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct-horse-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create admin account" }));

    await waitFor(() => expect(setAccessToken).toHaveBeenCalledWith("fresh-access-token"));
    expect(setSession).toHaveBeenCalledWith(registeredUser);
    expect(await screen.findByText("Admin home")).toBeInTheDocument();
  });

  it("validates the form before calling the API", async () => {
    mswServer.use(
      http.get(`${API_BASE}/auth/invite/admin`, () =>
        HttpResponse.json({ success: true, data: validInvite }),
      ),
    );

    renderPage("/register?token=raw-token-value");
    await screen.findByText(validInvite.email);

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse-1" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct-horse-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create admin account" }));
    expect(
      await screen.findByText("Enter a valid Nepali phone number starting with 98."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "9812345678" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "different-1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create admin account" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();

    expect(setAccessToken).not.toHaveBeenCalled();
  });

  it("shows the server's error message for an invalid invite", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/auth/invite/admin`,
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

    renderPage("/register?token=stale-token");

    expect(
      await screen.findByText("This invite link has expired or was already used."),
    ).toBeInTheDocument();
  });
});
