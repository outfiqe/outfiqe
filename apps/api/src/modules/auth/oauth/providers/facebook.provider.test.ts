import { afterEach, describe, expect, it, vi } from "vitest";

import { exchangeFacebookAuthorizationCode } from "./facebook.provider.js";

const CODE_EXCHANGE_INPUT = {
  code: "auth-code",
  codeVerifier: "code-verifier",
  redirectUri: "https://outfiqe.test/auth/oauth/facebook/callback",
};

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 400,
  json: () => Promise.resolve(body),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("exchangeFacebookAuthorizationCode", () => {
  it("normalizes a valid Facebook response into an OAuthProfile", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "a-real-access-token" }))
      .mockResolvedValueOnce(
        jsonResponse({
          id: "facebook-user-123",
          name: "Person Example",
          email: "person@example.com",
          picture: { data: { url: "https://example.com/avatar.jpg" } },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const profile = await exchangeFacebookAuthorizationCode(CODE_EXCHANGE_INPUT);

    expect(profile).toEqual({
      providerUserId: "facebook-user-123",
      email: "person@example.com",
      emailVerified: true,
      name: "Person Example",
      avatarUrl: "https://example.com/avatar.jpg",
    });

    const profileRequestUrl = new URL(fetchMock.mock.calls[1]?.[0] as string | URL);
    expect(profileRequestUrl.searchParams.get("appsecret_proof")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("rejects when the code exchange itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false)));

    await expect(exchangeFacebookAuthorizationCode(CODE_EXCHANGE_INPUT)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
  });

  it("rejects when the profile fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "a-real-access-token" }))
      .mockResolvedValueOnce(jsonResponse({}, false));
    vi.stubGlobal("fetch", fetchMock);

    await expect(exchangeFacebookAuthorizationCode(CODE_EXCHANGE_INPUT)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
  });

  it("rejects when the profile response has no email", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: "a-real-access-token" }))
      .mockResolvedValueOnce(jsonResponse({ id: "facebook-user-123", name: "Person Example" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(exchangeFacebookAuthorizationCode(CODE_EXCHANGE_INPUT)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
  });
});
