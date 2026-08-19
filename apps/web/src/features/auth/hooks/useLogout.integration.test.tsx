import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { createAuthQueryClientWrapper } from "../context/authTestWrapper";
import { AuthActionType, AuthStatus, type UserSession } from "../types";
import { useLogout } from "./useLogout";

const LOGOUT_URL = "/api/auth/logout";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ replace } = mockNextRouter());
});

const authenticatedUser: UserSession = {
  id: "user-1",
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  creatorStatus: "NONE",
};

const renderUseLogout = () => {
  const rendered = renderHook(() => ({ logout: useLogout(), auth: useAuth() }), {
    wrapper: createAuthQueryClientWrapper(),
  });

  act(() => {
    rendered.result.current.auth.dispatch({
      type: AuthActionType.AUTH_SUCCESS,
      payload: { user: authenticatedUser, accessToken: "access-token" },
    });
  });

  return rendered;
};

describe("useLogout", () => {
  it("clears auth state and redirects to /login", async () => {
    mswServer.use(
      http.post(LOGOUT_URL, () =>
        HttpResponse.json({ success: true, message: "Signed out.", data: null }),
      ),
    );

    const { result } = renderUseLogout();
    expect(result.current.auth.isAuthenticated).toBe(true);

    result.current.logout.mutate();

    await waitFor(() => expect(result.current.logout.isSuccess).toBe(true));
    expect(result.current.auth.state.status).toBe(AuthStatus.UNAUTHENTICATED);
    expect(result.current.auth.state.user).toBeNull();
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("still clears auth state when the API call fails, but does not redirect", async () => {
    mswServer.use(http.post(LOGOUT_URL, () => HttpResponse.error()));

    const { result } = renderUseLogout();

    result.current.logout.mutate();

    await waitFor(() => expect(result.current.logout.isError).toBe(true));
    expect(result.current.auth.state.status).toBe(AuthStatus.UNAUTHENTICATED);
    expect(replace).not.toHaveBeenCalled();
  });
});
