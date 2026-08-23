import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OAuthProvider } from "../types";
import { useLinkedAccounts } from "./useLinkedAccounts";

const LINKED_ACCOUNTS_URL = "/api/auth/oauth/linked";

describe("useLinkedAccounts", () => {
  it("loads the caller's linked oauth accounts", async () => {
    mswServer.use(
      http.get(LINKED_ACCOUNTS_URL, () =>
        HttpResponse.json({
          success: true,
          message: "Linked accounts.",
          data: {
            accounts: [
              {
                provider: OAuthProvider.GOOGLE,
                emailAtLinkTime: "ava@gmail.com",
                connectedAt: "2026-08-01T00:00:00.000Z",
              },
            ],
          },
        }),
      ),
    );

    const { result } = renderHook(() => useLinkedAccounts(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      {
        provider: OAuthProvider.GOOGLE,
        emailAtLinkTime: "ava@gmail.com",
        connectedAt: "2026-08-01T00:00:00.000Z",
      },
    ]);
  });

  it("surfaces a failed fetch", async () => {
    mswServer.use(http.get(LINKED_ACCOUNTS_URL, () => HttpResponse.error()));

    const { result } = renderHook(() => useLinkedAccounts(), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
