import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { env } from "#config/env.config.js";
import { prisma } from "#db/prisma.js";
import { OAuthProvider } from "#generated/prisma/enums.js";
import { hashPassword } from "#lib/password.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { testApp } from "#test/integration/testApp.js";

import { OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS } from "./oauth.constants.js";

const googleExchangeMock = vi.hoisted(() => vi.fn());
const facebookExchangeMock = vi.hoisted(() => vi.fn());

vi.mock("./providers/google.provider.js", () => ({
  exchangeGoogleAuthorizationCode: googleExchangeMock,
}));
vi.mock("./providers/facebook.provider.js", () => ({
  exchangeFacebookAuthorizationCode: facebookExchangeMock,
}));

afterEach(() => {
  vi.clearAllMocks();
});

const uniqueEmail = () => `oauth-${randomUUID()}@outfiqe.test`;
const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const mockGoogleProfile = (
  overrides: Partial<{
    providerUserId: string;
    email: string;
    emailVerified: boolean;
    name: string;
    avatarUrl: string | null;
  }> = {},
) => ({
  providerUserId: `google-${randomUUID()}`,
  email: uniqueEmail(),
  emailVerified: true,
  name: "OAuth Test User",
  avatarUrl: null,
  ...overrides,
});

const extractCookieValue = (response: request.Response, cookieName: string): string | undefined => {
  const rawCookies = response.headers["set-cookie"];
  const cookies = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];
  const match = cookies.find((cookie) => cookie.startsWith(`${cookieName}=`));
  if (!match) return undefined;

  return match.slice(cookieName.length + 1).split(";")[0];
};

const expectNoSessionCookies = (response: request.Response): void => {
  expect(extractCookieValue(response, "refresh_token")).toBeUndefined();
  expect(extractCookieValue(response, "has_session")).toBeUndefined();
};

const startGoogleFlow = async (redirectAfter?: string): Promise<{ state: string }> => {
  const response = await request(testApp)
    .get("/api/auth/oauth/google/start")
    .query(redirectAfter !== undefined ? { redirect: redirectAfter } : {});

  expect(response.status).toBe(302);
  const location = new URL(response.headers.location);
  const state = location.searchParams.get("state");
  if (!state)
    throw new Error(`No state param found in redirect location: ${response.headers.location}`);

  return { state };
};

const callGoogleCallback = (query: Record<string, string>) =>
  request(testApp).get("/api/auth/oauth/google/callback").query(query);

describe("GET /api/auth/oauth/:provider/start", () => {
  it("redirects to Google's authorization endpoint with a PKCE challenge and state", async () => {
    const response = await request(testApp).get("/api/auth/oauth/google/start");

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("code_challenge")).toBeTruthy();
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(location.searchParams.get("scope")).toBe("openid email profile");
  });

  it("rejects an unsupported provider", async () => {
    const response = await request(testApp).get("/api/auth/oauth/twitter/start");

    expect(response.status).toBe(422);
  });

  it("rate limits repeated start requests from the same ip", async () => {
    for (let attempt = 0; attempt < OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS; attempt += 1) {
      const response = await request(testApp).get("/api/auth/oauth/google/start");
      expect(response.status).toBe(302);
    }

    const limited = await request(testApp).get("/api/auth/oauth/google/start");

    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/auth/oauth/:provider/callback", () => {
  it("signs in an existing linked identity through the same session-issuance path as password login", async () => {
    const password = "correct-horse-battery";
    const user = await prisma.user.create({
      data: {
        email: uniqueEmail(),
        name: "Linked OAuth User",
        handle: `linked-oauth-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: await hashPassword(password),
        emailVerified: true,
      },
    });
    const profile = mockGoogleProfile({ email: user.email });
    await prisma.oAuthIdentity.create({
      data: {
        userId: user.id,
        provider: OAuthProvider.GOOGLE,
        providerUserId: profile.providerUserId,
        emailAtLinkTime: user.email,
      },
    });
    googleExchangeMock.mockResolvedValue(profile);

    const { state } = await startGoogleFlow("/dashboard");
    const response = await callGoogleCallback({ code: "test-code", state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${env.FRONTEND_URL}/dashboard`);
    expect(extractCookieValue(response, "refresh_token")).toBeTruthy();
    expect(extractCookieValue(response, "has_session")).toBe("1");
    expect(extractCookieValue(response, "csrf_token")).toBeTruthy();
    expect(response.headers.location).not.toContain("accessToken");
  });

  it("auto-creates a new account and oauth identity when no user or identity matches", async () => {
    const profile = mockGoogleProfile();
    googleExchangeMock.mockResolvedValue(profile);

    const { state } = await startGoogleFlow();
    const response = await callGoogleCallback({ code: "test-code", state });

    expect(response.status).toBe(302);
    expect(extractCookieValue(response, "refresh_token")).toBeTruthy();

    const createdUser = await prisma.user.findUniqueOrThrow({ where: { email: profile.email } });
    expect(createdUser.passwordHash).toBeNull();
    expect(createdUser.emailVerified).toBe(true);

    const identity = await prisma.oAuthIdentity.findUniqueOrThrow({
      where: {
        provider_providerUserId: {
          provider: OAuthProvider.GOOGLE,
          providerUserId: profile.providerUserId,
        },
      },
    });
    expect(identity.userId).toBe(createdUser.id);
  });

  it("returns a link-required redirect instead of auto-signing-in when the email matches an existing password account", async () => {
    const password = "correct-horse-battery";
    const existingUser = await prisma.user.create({
      data: {
        email: uniqueEmail(),
        name: "Existing Password User",
        handle: `existing-pw-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: await hashPassword(password),
        emailVerified: true,
      },
    });
    const profile = mockGoogleProfile({ email: existingUser.email });
    googleExchangeMock.mockResolvedValue(profile);

    const { state } = await startGoogleFlow();
    const response = await callGoogleCallback({ code: "test-code", state });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe("/auth/oauth-callback");
    expect(location.searchParams.get("email")).toBe(existingUser.email);
    const linkToken = location.searchParams.get("linkToken");
    expect(linkToken).toBeTruthy();
    expectNoSessionCookies(response);

    const usersWithThisEmail = await prisma.user.count({ where: { email: existingUser.email } });
    expect(usersWithThisEmail).toBe(1);

    const pendingRecordRaw = await redis.get(redisKeys.oauthLinkPending(linkToken as string));
    expect(pendingRecordRaw).toBeTruthy();
    const pendingRecord = JSON.parse(pendingRecordRaw as string) as { userId: string };
    expect(pendingRecord.userId).toBe(existingUser.id);
  });

  it("rejects an unverified provider email without creating an account", async () => {
    const profile = mockGoogleProfile({ emailVerified: false });
    googleExchangeMock.mockResolvedValue(profile);

    const { state } = await startGoogleFlow();
    const response = await callGoogleCallback({ code: "test-code", state });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe("/auth/oauth-callback");
    expect(location.searchParams.get("error")).toBeTruthy();
    expectNoSessionCookies(response);

    const createdUser = await prisma.user.findUnique({ where: { email: profile.email } });
    expect(createdUser).toBeNull();
  });

  it("rejects a callback with a missing or invalid state", async () => {
    const response = await callGoogleCallback({ code: "test-code", state: "never-issued-state" });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe("/auth/oauth-callback");
    expect(location.searchParams.get("error")).toBeTruthy();
    expectNoSessionCookies(response);
    expect(googleExchangeMock).not.toHaveBeenCalled();
  });

  it("rejects a replayed (already consumed) state", async () => {
    const profile = mockGoogleProfile();
    googleExchangeMock.mockResolvedValue(profile);

    const { state } = await startGoogleFlow();
    const firstResponse = await callGoogleCallback({ code: "test-code", state });
    expect(extractCookieValue(firstResponse, "refresh_token")).toBeTruthy();

    const replayedResponse = await callGoogleCallback({ code: "test-code", state });

    expect(replayedResponse.status).toBe(302);
    const location = new URL(replayedResponse.headers.location);
    expect(location.searchParams.get("error")).toBeTruthy();
    expectNoSessionCookies(replayedResponse);
    expect(googleExchangeMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a callback whose provider does not match the state's stored provider", async () => {
    const { state } = await startGoogleFlow();

    const response = await request(testApp)
      .get("/api/auth/oauth/facebook/callback")
      .query({ code: "test-code", state });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.searchParams.get("error")).toBeTruthy();
    expectNoSessionCookies(response);
    expect(facebookExchangeMock).not.toHaveBeenCalled();
  });

  it("redirects with an error when the provider reports an oauth error or omits code/state", async () => {
    const response = await callGoogleCallback({ error: "access_denied" });

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe("/auth/oauth-callback");
    expect(location.searchParams.get("error")).toBeTruthy();
    expectNoSessionCookies(response);
    expect(googleExchangeMock).not.toHaveBeenCalled();
  });

  it("sanitizes an unsafe absolute redirect target back to the site root", async () => {
    const profile = mockGoogleProfile();
    googleExchangeMock.mockResolvedValue(profile);

    const { state } = await startGoogleFlow("https://evil.example/steal");
    const response = await callGoogleCallback({ code: "test-code", state });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${env.FRONTEND_URL}/`);
  });
});
