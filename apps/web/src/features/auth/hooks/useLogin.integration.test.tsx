import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { createAuthQueryClientWrapper } from "../context/authTestWrapper";
import { ADMIN_URL } from "../utils/getDefaultRoute";
import { useLogin } from "./useLogin";

const LOGIN_URL = "/api/auth/login";
const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";

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
  phone: "9812345678",
  avatarUrl: null,
  role: "CUSTOMER",
  isCreator: false,
  creatorStatus: "NONE",
  hasPassword: true,
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
    expect(replace).toHaveBeenCalledWith("/profile");
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

  it("hard-navigates admins to their app instead of updating auth state", async () => {
    const originalLocation = window.location;
    const locationReplace = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, replace: locationReplace },
    });

    mswServer.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Login successful",
          data: { accessToken: "access-token", user: { ...customerUser, role: "ADMIN" } },
        }),
      ),
    );

    const { result } = renderUseLogin();
    result.current.login.mutate({ email: customerUser.email, password: "correct-horse-battery" });

    await waitFor(() => expect(result.current.login.isSuccess).toBe(true));
    await waitFor(() => expect(locationReplace).toHaveBeenCalledWith(ADMIN_URL));
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.auth.isAuthenticated).toBe(false);

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("hard-navigates to a deep admin redirect target from a tenant host", async () => {
    const originalLocation = window.location;
    const locationReplace = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: `studio.${TENANT_BASE_DOMAIN}`,
        replace: locationReplace,
      },
    });

    const deepAdminRedirect = `${ADMIN_URL}/crm/invites/accept?token=abc123`;
    mockRedirectParam(deepAdminRedirect);
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
    await waitFor(() => expect(locationReplace).toHaveBeenCalledWith(deepAdminRedirect));
    expect(replace).not.toHaveBeenCalled();
    expect(result.current.auth.isAuthenticated).toBe(false);

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("ignores a cross-app admin redirect target when the login page is not on a tenant host", async () => {
    const originalLocation = window.location;
    const locationReplace = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "localhost", replace: locationReplace },
    });

    mockRedirectParam(`${ADMIN_URL}/crm/invites/accept?token=abc123`);
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
    expect(locationReplace).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/profile");
    expect(result.current.auth.isAuthenticated).toBe(true);

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });
});
