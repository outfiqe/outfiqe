import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { render, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/shared/lib/apiClient";

import { AuthStatus } from "../types";
import { useAuth } from "./AuthContext";
import { createAuthQueryClientWrapper } from "./authTestWrapper";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

beforeEach(() => {
  mockNextRouter();
});

const SESSION_URL = "/api/auth/session";
const CURRENT_USER_URL = "/api/auth/me";
const REFRESH_URL = "/api/auth/refresh";
const ORDERS_URL = "/api/orders";
const SLOW_SESSION_MS = 50;

const currentUser = {
  id: "user-1",
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  phone: null,
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  creatorStatus: "NONE",
  hasPassword: true,
};

const setHasSessionCookie = () => {
  document.cookie = "has_session=1";
};

afterEach(() => {
  document.cookie = "has_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
});

const renderAuth = () => renderHook(() => useAuth(), { wrapper: createAuthQueryClientWrapper() });

describe("AuthProvider session bootstrap", () => {
  it("restores the session from /auth/session without touching the rotating /auth/refresh", async () => {
    setHasSessionCookie();
    const rotateSession = vi.fn(() => new HttpResponse(null, { status: 500 }));
    const fetchCurrentUser = vi.fn(() =>
      HttpResponse.json({ success: true, message: "Current user.", data: currentUser }),
    );
    mswServer.use(
      http.post(SESSION_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Session is valid.",
          data: { accessToken: "access-token", user: currentUser },
        }),
      ),
      http.get(CURRENT_USER_URL, fetchCurrentUser),
      http.post(REFRESH_URL, rotateSession),
    );

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.state.status).toBe(AuthStatus.AUTHENTICATED));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.state.user).toMatchObject({ id: currentUser.id });
    expect(rotateSession).not.toHaveBeenCalled();
    expect(fetchCurrentUser).not.toHaveBeenCalled();
  });

  it.each([
    { role: "ADMIN", expectedIsStaff: true },
    { role: "TENANT_STAFF", expectedIsStaff: true },
    { role: "BRAND_OWNER", expectedIsStaff: false },
    { role: "CUSTOMER", expectedIsStaff: false },
  ])(
    "reports isStaff as $expectedIsStaff for a $role account",
    async ({ role, expectedIsStaff }) => {
      setHasSessionCookie();
      mswServer.use(
        http.post(SESSION_URL, () =>
          HttpResponse.json({
            success: true,
            message: "Session is valid.",
            data: { accessToken: "access-token", user: { ...currentUser, role } },
          }),
        ),
      );

      const { result } = renderAuth();

      await waitFor(() => expect(result.current.state.status).toBe(AuthStatus.AUTHENTICATED));
      expect(result.current.isStaff).toBe(expectedIsStaff);
    },
  );

  it("resolves to unauthenticated when /auth/session rejects the cookie", async () => {
    setHasSessionCookie();
    mswServer.use(
      http.post(SESSION_URL, () =>
        HttpResponse.json(
          { success: false, message: "Refresh token is invalid.", code: "INVALID_TOKEN" },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.isAuthResolved).toBe(true));
    expect(result.current.state.status).toBe(AuthStatus.UNAUTHENTICATED);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("holds a page's first signed-in request until the session is back, so it never goes out without a token", async () => {
    setHasSessionCookie();
    const rotateSession = vi.fn(() => new HttpResponse(null, { status: 500 }));
    const authorizationHeaders: (string | null)[] = [];
    mswServer.use(
      http.post(SESSION_URL, async () => {
        await new Promise((resolve) => setTimeout(resolve, SLOW_SESSION_MS));
        return HttpResponse.json({
          success: true,
          message: "Session is valid.",
          data: { accessToken: "access-token", user: currentUser },
        });
      }),
      http.post(REFRESH_URL, rotateSession),
      http.get(ORDERS_URL, ({ request }) => {
        authorizationHeaders.push(request.headers.get("Authorization"));
        return HttpResponse.json({ success: true, message: "Orders.", data: { orders: [] } });
      }),
    );

    const LoadsOrdersOnMount = () => {
      useEffect(() => {
        void apiClient.get("/orders");
      }, []);
      return null;
    };
    render(<LoadsOrdersOnMount />, { wrapper: createAuthQueryClientWrapper() });

    await waitFor(() => expect(authorizationHeaders).toEqual(["Bearer access-token"]));
    expect(rotateSession).not.toHaveBeenCalled();
  });

  it("skips the network entirely when no has_session cookie is present", async () => {
    const checkSession = vi.fn(() => new HttpResponse(null, { status: 500 }));
    mswServer.use(http.post(SESSION_URL, checkSession));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.state.status).toBe(AuthStatus.UNAUTHENTICATED));
    expect(checkSession).not.toHaveBeenCalled();
  });
});
