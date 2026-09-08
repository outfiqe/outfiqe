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

const { requireAuthedSession, requireDashboardSession } = await import("./requireDashboardSession");

const sessionFor = (user: Partial<ServerSession["user"]>): ServerSession => ({
  accessToken: "token",
  user: {
    id: "u1",
    name: "Test",
    email: "test@example.com",
    avatarUrl: null,
    role: UserRole.CUSTOMER,
    isCreator: false,
    creatorStatus: CreatorStatus.NONE,
    ...user,
  },
});

beforeEach(() => {
  redirect.mockClear();
  getServerSessionWithToken.mockReset();
});

describe("requireAuthedSession", () => {
  it("redirects an anonymous visitor to login with a return path", async () => {
    getServerSessionWithToken.mockResolvedValue(null);
    await expect(requireAuthedSession("/messages/abc")).rejects.toThrow(
      "REDIRECT:/login?redirect=%2Fmessages%2Fabc",
    );
  });

  it("returns the session for any signed-in user, admin included", async () => {
    const session = sessionFor({ role: UserRole.ADMIN });
    getServerSessionWithToken.mockResolvedValue(session);
    await expect(requireAuthedSession("/messages/abc")).resolves.toBe(session);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("requireDashboardSession", () => {
  it("lets a creator through", async () => {
    getServerSessionWithToken.mockResolvedValue(sessionFor({ isCreator: true }));
    await requireDashboardSession("/earnings");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends an admin with no creator or brand dashboard to the admin app", async () => {
    getServerSessionWithToken.mockResolvedValue(sessionFor({ role: UserRole.ADMIN }));
    await expect(requireDashboardSession("/earnings")).rejects.toThrow("REDIRECT:/admin");
  });

  it("lets an admin who is also an approved creator reach the dashboard", async () => {
    getServerSessionWithToken.mockResolvedValue(
      sessionFor({
        role: UserRole.ADMIN,
        isCreator: true,
        creatorStatus: CreatorStatus.APPROVED,
      }),
    );
    await requireDashboardSession("/earnings");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("lets an admin who is also a brand member reach the dashboard", async () => {
    getServerSessionWithToken.mockResolvedValue(
      sessionFor({ role: UserRole.ADMIN, brandId: "brand-1" }),
    );
    await requireDashboardSession("/manage-orders");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("does not send a plain customer to the admin app", async () => {
    getServerSessionWithToken.mockResolvedValue(sessionFor({}));
    await requireDashboardSession("/overview");
    expect(redirect).not.toHaveBeenCalled();
  });
});
