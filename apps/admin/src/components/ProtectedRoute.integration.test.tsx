import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/features/auth/AuthContext";

import { ProtectedRoute } from "./ProtectedRoute";

const API_BASE = "http://localhost:3000/api";

const mockRestoredAdminSession = () => {
  mswServer.use(
    http.post(`${API_BASE}/auth/refresh`, () =>
      HttpResponse.json({ success: true, message: "Refreshed.", data: { accessToken: "token" } }),
    ),
    http.get(`${API_BASE}/auth/me`, () =>
      HttpResponse.json({
        success: true,
        message: "Current user.",
        data: {
          id: "admin-1",
          name: "Test Admin",
          email: "test-admin@outfiqe.test",
          avatarUrl: null,
          role: "ADMIN",
          hasPlatformAccess: false,
          isCoFounder: false,
          hiddenPlatformNavKeys: [],
        },
      }),
    ),
  );
};

const mockNoSession = () => {
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
};

const renderProtected = () =>
  render(
    <AuthProvider>
      <ProtectedRoute>
        <p>protected dashboard</p>
      </ProtectedRoute>
    </AuthProvider>,
  );

describe("ProtectedRoute", () => {
  it("shows a loading state while the session is still being restored", () => {
    mockRestoredAdminSession();
    renderProtected();

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("protected dashboard")).not.toBeInTheDocument();
  });

  it("renders the protected content once a valid admin session is restored", async () => {
    mockRestoredAdminSession();
    renderProtected();

    expect(await screen.findByText("protected dashboard")).toBeInTheDocument();
  });

  it("withholds the content and shows the redirect notice when there is no session", async () => {
    mockNoSession();
    renderProtected();

    expect(await screen.findByText("Redirecting to sign in…")).toBeInTheDocument();
    expect(screen.queryByText("protected dashboard")).not.toBeInTheDocument();
  });
});
