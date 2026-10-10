import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useChangePassword } from "./useChangePassword";

const CHANGE_PASSWORD_URL = "/api/auth/change-password";

const input = {
  currentPassword: "old-secret-1",
  newPassword: "new-secret-2",
  confirmNewPassword: "new-secret-2",
};

describe("useChangePassword", () => {
  it("sends the current and new password and returns the confirmation message", async () => {
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, async ({ request }) => {
        expect(await request.json()).toEqual(input);
        return HttpResponse.json({
          success: true,
          message: "Password updated. Other devices have been signed out.",
          data: null,
        });
      }),
    );

    const { result } = renderHook(() => useChangePassword(), {
      wrapper: createQueryClientWrapper(),
    });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.message).toContain("signed out");
  });

  it("surfaces the API error code for an incorrect current password", async () => {
    mswServer.use(
      http.post(CHANGE_PASSWORD_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Your current password is incorrect.",
            code: "INVALID_CURRENT_PASSWORD",
          },
          { status: 401 },
        ),
      ),
    );

    const { result } = renderHook(() => useChangePassword(), {
      wrapper: createQueryClientWrapper(),
    });
    result.current.mutate(input);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("INVALID_CURRENT_PASSWORD");
  });
});
