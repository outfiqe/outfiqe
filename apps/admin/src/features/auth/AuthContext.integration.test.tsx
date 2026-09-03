import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";
import type { AdminUser } from "./schemas";

const API_BASE = "http://localhost:3000/api";

const FALLBACK_USER: AdminUser = {
  id: "user-2",
  name: "Set Directly",
  email: "set-directly@outfiqe.test",
  avatarUrl: null,
  role: "ADMIN",
  hasPlatformAccess: false,
  isCoFounder: false,
  hiddenPlatformNavKeys: [],
};

const mockSessionFor = (role: "ADMIN" | "BRAND_OWNER" | "CUSTOMER") => {
  mswServer.use(
    http.post(`${API_BASE}/auth/refresh`, () =>
      HttpResponse.json({ success: true, message: "Refreshed.", data: { accessToken: "token" } }),
    ),
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json({
        success: true,
        message: "Current user.",
        data: {
          id: "user-1",
          name: "Test User",
          email: "test-user@outfiqe.test",
          avatarUrl: null,
          role,
          hasPlatformAccess: false,
          isCoFounder: false,
          hiddenPlatformNavKeys: [],
        },
      }),
    ),
  );
};

const StatusProbe = () => {
  const { state } = useAuth();
  return <p>{state.status}</p>;
};

const SessionProbe = () => {
  const { state, logout, updateUser, setSession } = useAuth();
  return (
    <div>
      <p>status: {state.status}</p>
      {state.status === "signed-in" && <p>name: {state.user.name}</p>}
      <button onClick={() => updateUser({ name: "Renamed User" })}>rename</button>
      <button
        onClick={() =>
          setSession({
            id: "user-2",
            name: "Injected User",
            email: "injected@outfiqe.test",
            avatarUrl: null,
            role: "ADMIN",
            hasPlatformAccess: true,
            isCoFounder: false,
            hiddenPlatformNavKeys: [],
          })
        }
      >
        inject session
      </button>
      <button onClick={() => void logout()}>log out</button>
    </div>
  );
};

const renderAuthProvider = () =>
  render(
    <AuthProvider>
      <StatusProbe />
    </AuthProvider>,
  );

describe("AuthProvider", () => {
  it("signs in an ADMIN account", async () => {
    mockSessionFor("ADMIN");
    renderAuthProvider();

    expect(await screen.findByText("signed-in")).toBeInTheDocument();
  });

  it("signs in a BRAND_OWNER account, so a business can reach its own CRM organization", async () => {
    mockSessionFor("BRAND_OWNER");
    renderAuthProvider();

    expect(await screen.findByText("signed-in")).toBeInTheDocument();
  });

  it("signs out a CUSTOMER account", async () => {
    mockSessionFor("CUSTOMER");
    renderAuthProvider();

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
  });

  it("renames the current user in place, injects a session, and clears it on logout", async () => {
    mockSessionFor("ADMIN");
    mswServer.use(
      http.post(`${API_BASE}/auth/logout`, () =>
        HttpResponse.json({ success: true, message: "Logged out.", data: null }),
      ),
    );
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText("name: Test User")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "rename" }));
    expect(await screen.findByText("name: Renamed User")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "inject session" }));
    expect(await screen.findByText("name: Injected User")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "log out" }));
    expect(await screen.findByText("status: signed-out")).toBeInTheDocument();
  });

  it("still signs out locally when the logout request fails", async () => {
    mockSessionFor("ADMIN");
    mswServer.use(
      http.post(`${API_BASE}/auth/logout`, () => new HttpResponse(null, { status: 500 })),
    );
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    );

    await screen.findByText("name: Test User");
    await user.click(screen.getByRole("button", { name: "log out" }));

    expect(await screen.findByText("status: signed-out")).toBeInTheDocument();
  });

  it("signs out when the refresh call itself fails", async () => {
    mswServer.use(
      http.post(
        `${API_BASE}/auth/refresh`,
        () =>
          new HttpResponse(
            JSON.stringify({ success: false, message: "No session.", code: "UNAUTHORIZED" }),
            { status: 401 },
          ),
      ),
    );
    renderAuthProvider();

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
  });
});

const SessionActionsProbe = () => {
  const { state, logout, updateUser, setSession } = useAuth();
  return (
    <div>
      <p>status:{state.status}</p>
      {state.status === "signed-in" && <p>name:{state.user.name}</p>}
      <button type="button" onClick={() => void logout()}>
        sign out
      </button>
      <button type="button" onClick={() => updateUser({ name: "Renamed Admin" })}>
        rename
      </button>
      <button type="button" onClick={() => setSession(FALLBACK_USER)}>
        set session
      </button>
    </div>
  );
};

const renderSessionActions = () =>
  render(
    <AuthProvider>
      <SessionActionsProbe />
    </AuthProvider>,
  );

describe("AuthProvider session actions", () => {
  it("clears the session on logout", async () => {
    mockSessionFor("ADMIN");
    mswServer.use(
      http.post(`${API_BASE}/auth/logout`, () =>
        HttpResponse.json({ success: true, message: "Signed out.", data: null }),
      ),
    );
    renderSessionActions();
    expect(await screen.findByText("status:signed-in")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "sign out" }));

    expect(await screen.findByText("status:signed-out")).toBeInTheDocument();
  });

  it("patches the signed-in user with updateUser", async () => {
    mockSessionFor("ADMIN");
    renderSessionActions();
    expect(await screen.findByText("name:Test User")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "rename" }));

    expect(await screen.findByText("name:Renamed Admin")).toBeInTheDocument();
  });

  it("establishes a session from a directly provided user with setSession", async () => {
    mockSessionFor("CUSTOMER");
    renderSessionActions();
    expect(await screen.findByText("status:signed-out")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "set session" }));

    expect(await screen.findByText("status:signed-in")).toBeInTheDocument();
    expect(screen.getByText("name:Set Directly")).toBeInTheDocument();
  });
});
