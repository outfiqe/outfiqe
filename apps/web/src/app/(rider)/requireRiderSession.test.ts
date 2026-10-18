import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerSession } from "@/features/auth/api/serverAuth";
import { CreatorStatus, UserRole } from "@/features/auth/types";

vi.mock("server-only", () => ({}));

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const getServerSessionWithToken = vi.fn<() => Promise<ServerSession | null>>();
vi.mock("@/features/auth/api/serverAuth", () => ({
  getServerSessionWithToken: () => getServerSessionWithToken(),
}));

const { requireRiderSession } = await import("./requireRiderSession");

const sessionFor = (role: ServerSession["user"]["role"]): ServerSession => ({
  accessToken: "token",
  user: {
    id: "u1",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    role,
    isCreator: false,
    creatorStatus: CreatorStatus.NONE,
  },
});

beforeEach(() => {
  redirect.mockClear();
  getServerSessionWithToken.mockReset();
});

describe("requireRiderSession", () => {
  it("sends a signed-out visitor to login", async () => {
    getServerSessionWithToken.mockResolvedValue(null);

    await expect(requireRiderSession("/rider")).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Frider",
    );
  });

  it("lets a rider in", async () => {
    const session = sessionFor(UserRole.RIDER);
    getServerSessionWithToken.mockResolvedValue(session);

    await expect(requireRiderSession("/rider")).resolves.toBe(session);
  });

  it("sends anyone else to their own home", async () => {
    getServerSessionWithToken.mockResolvedValue(sessionFor(UserRole.CUSTOMER));

    await expect(requireRiderSession("/rider")).rejects.toThrow("REDIRECT:/overview");
  });
});
