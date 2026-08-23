import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OAuthProvider } from "../types";
import { useUnlinkAccount } from "./useUnlinkAccount";

const UNLINK_URL = "/api/auth/oauth/google/link";

describe("useUnlinkAccount", () => {
  it("disconnects the provider", async () => {
    mswServer.use(
      http.delete(UNLINK_URL, () =>
        HttpResponse.json({ success: true, message: "Account disconnected.", data: null }),
      ),
    );

    const { result } = renderHook(() => useUnlinkAccount(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ provider: OAuthProvider.GOOGLE, password: "correct-horse-battery" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("surfaces the backend's ONLY_AUTH_METHOD conflict", async () => {
    mswServer.use(
      http.delete(
        UNLINK_URL,
        () =>
          HttpResponse.json(
            {
              success: false,
              message: "Connect another sign-in method before disconnecting this one.",
              code: "ONLY_AUTH_METHOD",
            },
            { status: 409 },
          ),
        { once: true },
      ),
    );

    const { result } = renderHook(() => useUnlinkAccount(), {
      wrapper: createQueryClientWrapper(),
    });

    result.current.mutate({ provider: OAuthProvider.GOOGLE });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe("ONLY_AUTH_METHOD");
  });
});
