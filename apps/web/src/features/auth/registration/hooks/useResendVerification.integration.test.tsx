import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { useResendVerification } from "./useResendVerification";

const RESEND_VERIFICATION_URL = "/api/auth/resend-verification";

describe("useResendVerification", () => {
  it("re-sends the verification email for the given address", async () => {
    mswServer.use(
      http.post(RESEND_VERIFICATION_URL, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ email: "ava@outfiqe.test" });

        return HttpResponse.json({
          success: true,
          message: "If that email is registered, a new verification link is on its way.",
          data: null,
        });
      }),
    );

    const { result } = renderHook(() => useResendVerification(), {
      wrapper: createQueryClientWrapper(),
    });
    result.current.mutate("ava@outfiqe.test");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.message).toContain("verification link");
  });
});
