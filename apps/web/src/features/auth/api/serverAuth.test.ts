import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreatorStatus, UserRole } from "../types";

vi.mock("server-only", () => ({}));

const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));

const serverApiRequest = vi.fn();
vi.mock("@/shared/lib/serverApiClient", () => ({
  serverApiRequest: (...args: unknown[]) => serverApiRequest(...args),
}));

const importServerAuth = async () => {
  vi.resetModules();
  return import("./serverAuth");
};

const SESSION_RESPONSE = {
  accessToken: "access-token-1",
  user: {
    id: "u1",
    name: "Test User",
    email: "test@example.com",
    phone: null,
    avatarUrl: null,
    role: UserRole.CUSTOMER,
    isCreator: false,
    creatorStatus: CreatorStatus.NONE,
    hasPassword: true,
  },
};

beforeEach(() => {
  cookieGet.mockReset();
  serverApiRequest.mockReset();
});

describe("serverAuth", () => {
  it("returns null from both helpers when there is no refresh token cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    const { getServerAccessToken, getServerSessionWithToken } = await importServerAuth();

    await expect(getServerAccessToken()).resolves.toBeNull();
    await expect(getServerSessionWithToken()).resolves.toBeNull();
    expect(serverApiRequest).not.toHaveBeenCalled();
  });

  it("derives the access token from a single /auth/session response", async () => {
    cookieGet.mockReturnValue({ value: "raw-refresh-token" });
    serverApiRequest.mockResolvedValue(SESSION_RESPONSE);
    const { getServerAccessToken } = await importServerAuth();

    await expect(getServerAccessToken()).resolves.toBe("access-token-1");
    expect(serverApiRequest).toHaveBeenCalledWith("/auth/session", {
      method: "POST",
      cookie: "refresh_token=raw-refresh-token",
    });
  });

  it("derives the full session, including the user, from the same /auth/session response", async () => {
    cookieGet.mockReturnValue({ value: "raw-refresh-token" });
    serverApiRequest.mockResolvedValue(SESSION_RESPONSE);
    const { getServerSessionWithToken } = await importServerAuth();

    await expect(getServerSessionWithToken()).resolves.toMatchObject({
      accessToken: "access-token-1",
      user: { id: "u1", email: "test@example.com", role: UserRole.CUSTOMER },
    });
    expect(serverApiRequest).toHaveBeenCalledWith("/auth/session", {
      method: "POST",
      cookie: "refresh_token=raw-refresh-token",
    });
  });

  it("returns null from both helpers when the session request fails", async () => {
    cookieGet.mockReturnValue({ value: "raw-refresh-token" });
    serverApiRequest.mockRejectedValue(new Error("network error"));
    const { getServerAccessToken, getServerSessionWithToken } = await importServerAuth();

    await expect(getServerAccessToken()).resolves.toBeNull();
    await expect(getServerSessionWithToken()).resolves.toBeNull();
  });

  it("returns null from both helpers when the response fails schema validation", async () => {
    cookieGet.mockReturnValue({ value: "raw-refresh-token" });
    serverApiRequest.mockResolvedValue({ accessToken: "token-only" });
    const { getServerAccessToken, getServerSessionWithToken } = await importServerAuth();

    await expect(getServerAccessToken()).resolves.toBeNull();
    await expect(getServerSessionWithToken()).resolves.toBeNull();
  });
});
