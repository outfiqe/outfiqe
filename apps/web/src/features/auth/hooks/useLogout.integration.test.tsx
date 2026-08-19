import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthActionType, AuthStatus, type UserSession } from "../types";
import { useLogout } from "./useLogout";

const LOGOUT_URL = "/api/auth/logout";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const replace = vi.fn();

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push: vi.fn(),
    replace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: "test-bfcache-id",
  });
  replace.mockClear();
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

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
  const rendered = renderHook(() => ({ logout: useLogout(), auth: useAuth() }), { wrapper });

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
