import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useResetPassword } from "./useResetPassword";

const RESET_PASSWORD_URL = "/api/auth/reset-password";

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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const resetInput = {
  token: "valid-token",
  password: "brand-new-password",
  confirmPassword: "brand-new-password",
};

describe("useResetPassword", () => {
  it("resets the password and redirects to login", async () => {
    mswServer.use(
      http.post(RESET_PASSWORD_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Password updated. Please sign in with your new password.",
          data: null,
        }),
      ),
    );

    const { result } = renderHook(() => useResetPassword(), { wrapper });
    result.current.mutate(resetInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(replace).toHaveBeenCalledWith("/login?reset=1");
  });

  it("surfaces an expired-token error without redirecting", async () => {
    mswServer.use(
      http.post(RESET_PASSWORD_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "This reset link has expired. Please request a new one.",
            code: "TOKEN_EXPIRED",
          },
          { status: 400 },
        ),
      ),
    );

    const { result } = renderHook(() => useResetPassword(), { wrapper });
    result.current.mutate(resetInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("TOKEN_EXPIRED");
    expect(replace).not.toHaveBeenCalled();
  });
});
