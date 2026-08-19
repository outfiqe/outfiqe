import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { createAuthQueryClientWrapper } from "../context/authTestWrapper";
import { useLogin } from "./useLogin";

const LOGIN_URL = "/api/auth/login";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

let replace: ReturnType<typeof vi.fn>;

const mockRedirectParam = (redirect: string | null) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(redirect ? { redirect } : undefined) as ReturnType<typeof useSearchParams>,
  );
};

beforeEach(() => {
  ({ replace } = mockNextRouter());
  mockRedirectParam(null);
});

const customerUser = {
  id: "user-1",
  name: "Ava Martinez",
  email: "ava@outfiqe.test",
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  creatorStatus: "NONE",
};

const renderUseLogin = () =>
  renderHook(() => ({ login: useLogin(), auth: useAuth() }), {
    wrapper: createAuthQueryClientWrapper(),
  });

describe("useLogin", () => {
  it("signs the user in, updates auth state, and redirects to their default route", async () => {
    mswServer.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Login successful",
          data: { accessToken: "access-token", user: customerUser },
        }),
      ),
    );

    const { result } = renderUseLogin();
    result.current.login.mutate({ email: customerUser.email, password: "correct-horse-battery" });

    await waitFor(() => expect(result.current.login.isSuccess).toBe(true));
    expect(result.current.auth.isAuthenticated).toBe(true);
    expect(result.current.auth.state.user).toMatchObject({ id: customerUser.id });
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to a safe ?redirect= target when present", async () => {
    mockRedirectParam("/checkout");
    mswServer.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Login successful",
          data: { accessToken: "access-token", user: customerUser },
        }),
      ),
    );

    const { result } = renderUseLogin();
    result.current.login.mutate({ email: customerUser.email, password: "correct-horse-battery" });

    await waitFor(() => expect(result.current.login.isSuccess).toBe(true));
    expect(replace).toHaveBeenCalledWith("/checkout");
  });

  it("surfaces invalid credentials as an error without updating auth state", async () => {
    mswServer.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json(
          { success: false, message: "Incorrect email or password.", code: "INVALID_CREDENTIALS" },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderUseLogin();
    result.current.login.mutate({ email: customerUser.email, password: "wrong-password" });

    await waitFor(() => expect(result.current.login.isError).toBe(true));
    expect(result.current.login.error?.code).toBe("INVALID_CREDENTIALS");
    expect(result.current.auth.isAuthenticated).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
