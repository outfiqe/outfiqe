import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useForgotPassword } from "./useForgotPassword";

const FORGOT_PASSWORD_URL = "/api/auth/forgot-password";

describe("useForgotPassword", () => {
  it("requests a reset link for the given email", async () => {
    mswServer.use(
      http.post(FORGOT_PASSWORD_URL, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ email: "ava@outfiqe.test" });

        return HttpResponse.json({
          success: true,
          message: "If that email is registered, you will receive a reset link shortly.",
          data: null,
        });
      }),
    );

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: createQueryClientWrapper(),
    });
    result.current.mutate({ email: "ava@outfiqe.test" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.message).toContain("reset link");
  });

  it("surfaces a rate-limit error from the API", async () => {
    mswServer.use(
      http.post(FORGOT_PASSWORD_URL, () =>
        HttpResponse.json(
          {
            success: false,
            message: "Too many password reset requests. Please try again in 15 minutes.",
            code: "RATE_LIMITED",
          },
          { status: 429 },
        ),
      ),
    );

    const { result } = renderHook(() => useForgotPassword(), {
      wrapper: createQueryClientWrapper(),
    });
    result.current.mutate({ email: "ava@outfiqe.test" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("RATE_LIMITED");
  });
});
