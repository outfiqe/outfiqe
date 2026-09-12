import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    mswServer.use(
      http.post(SESSION_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Session is valid.",
          data: { accessToken: "access-token" },
        }),
      ),
      http.get(CURRENT_USER_URL, () =>
        HttpResponse.json({ success: true, message: "Current user.", data: currentUser }),
      ),
      http.post(REFRESH_URL, rotateSession),
    );

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.state.status).toBe(AuthStatus.AUTHENTICATED));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.state.user).toMatchObject({ id: currentUser.id });
    expect(rotateSession).not.toHaveBeenCalled();
  });

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

  it("skips the network entirely when no has_session cookie is present", async () => {
    const checkSession = vi.fn(() => new HttpResponse(null, { status: 500 }));
    mswServer.use(http.post(SESSION_URL, checkSession));

    const { result } = renderAuth();

    await waitFor(() => expect(result.current.state.status).toBe(AuthStatus.UNAUTHENTICATED));
    expect(checkSession).not.toHaveBeenCalled();
  });
});
