import { describe, expect, it, vi } from "vitest";

import type { ServerSession } from "@/features/auth/api/serverAuth";
import { CreatorStatus, UserRole } from "@/features/auth/types";

vi.mock("server-only", () => ({}));

const { resolveCanEarn } = await import("./resolveCanEarn");

const userWith = (creatorStatus: CreatorStatus): ServerSession["user"] => ({
  id: "u1",
  name: "Sita",
  email: "sita@example.com",
  avatarUrl: null,
  role: UserRole.CUSTOMER,
  isCreator: creatorStatus === CreatorStatus.APPROVED,
  creatorStatus,
});

describe("resolveCanEarn", () => {
  it("lets someone who earned from a build in, even without being a creator", async () => {
    const canEarn = await resolveCanEarn(userWith(CreatorStatus.NONE), async () => ({
      canEarn: true,
    }));

    expect(canEarn).toBe(true);
  });

  it("follows the server's answer when it says no", async () => {
    const canEarn = await resolveCanEarn(userWith(CreatorStatus.NONE), async () => ({
      canEarn: false,
    }));

    expect(canEarn).toBe(false);
  });

  it("falls back to creator approval when the check can't be reached", async () => {
    const failingCheck = () => Promise.reject(new Error("network down"));

    await expect(resolveCanEarn(userWith(CreatorStatus.APPROVED), failingCheck)).resolves.toBe(
      true,
    );
    await expect(resolveCanEarn(userWith(CreatorStatus.NONE), failingCheck)).resolves.toBe(false);
  });
});
