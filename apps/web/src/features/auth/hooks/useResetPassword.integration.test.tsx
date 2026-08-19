import { mockNextRouter } from "@test/integration/mockRouter";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useResetPassword } from "./useResetPassword";

const RESET_PASSWORD_URL = "/api/auth/reset-password";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

let replace: ReturnType<typeof vi.fn>;

beforeEach(() => {
  ({ replace } = mockNextRouter());
});

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

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: createQueryClientWrapper(),
    });
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

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: createQueryClientWrapper(),
    });
    result.current.mutate(resetInput);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("TOKEN_EXPIRED");
    expect(replace).not.toHaveBeenCalled();
  });
});
