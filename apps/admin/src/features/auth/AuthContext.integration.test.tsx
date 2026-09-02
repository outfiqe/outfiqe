import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

const API_BASE = "http://localhost:3000/api";

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
