import { afterEach, describe, expect, it, vi } from "vitest";

const googleClientMock = vi.hoisted(() => ({
  getToken: vi.fn(),
  verifyIdToken: vi.fn(),
}));

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(function OAuth2ClientMock() {
    return googleClientMock;
  }),
}));

const { exchangeGoogleAuthorizationCode } = await import("./google.provider.js");

const CODE_EXCHANGE_INPUT = {
  code: "auth-code",
  codeVerifier: "code-verifier",
  redirectUri: "https://outfiqe.test/auth/oauth/google/callback",
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("exchangeGoogleAuthorizationCode", () => {
  it("normalizes a valid Google response into an OAuthProfile", async () => {
    googleClientMock.getToken.mockResolvedValue({ tokens: { id_token: "a-real-id-token" } });
    googleClientMock.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-123",
        email: "person@example.com",
        email_verified: true,
        name: "Person Example",
        picture: "https://example.com/avatar.jpg",
      }),
    });

    const profile = await exchangeGoogleAuthorizationCode(CODE_EXCHANGE_INPUT);

    expect(profile).toEqual({
      providerUserId: "google-user-123",
      email: "person@example.com",
      emailVerified: true,
      name: "Person Example",
      avatarUrl: "https://example.com/avatar.jpg",
    });
  });

  it("rejects when the code exchange itself fails", async () => {
    googleClientMock.getToken.mockRejectedValue(new Error("invalid_grant"));

    await expect(exchangeGoogleAuthorizationCode(CODE_EXCHANGE_INPUT)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
  });

  it("rejects when the token exchange returns no id_token", async () => {
    googleClientMock.getToken.mockResolvedValue({ tokens: {} });

    await expect(exchangeGoogleAuthorizationCode(CODE_EXCHANGE_INPUT)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
  });

  it("rejects when the id_token fails verification", async () => {
    googleClientMock.getToken.mockResolvedValue({ tokens: { id_token: "a-real-id-token" } });
    googleClientMock.verifyIdToken.mockRejectedValue(new Error("invalid signature"));

    await expect(exchangeGoogleAuthorizationCode(CODE_EXCHANGE_INPUT)).rejects.toMatchObject({
      code: "OAUTH_EXCHANGE_FAILED",
    });
  });

  it("passes through an unverified email as-is, without throwing (rejection is the caller's policy decision)", async () => {
    googleClientMock.getToken.mockResolvedValue({ tokens: { id_token: "a-real-id-token" } });
    googleClientMock.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: "google-user-123",
        email: "person@example.com",
        email_verified: false,
        name: "Person Example",
      }),
    });

    const profile = await exchangeGoogleAuthorizationCode(CODE_EXCHANGE_INPUT);
    expect(profile.emailVerified).toBe(false);
  });
});
