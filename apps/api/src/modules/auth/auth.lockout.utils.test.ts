import { afterEach, describe, expect, it, vi } from "vitest";

import { isLockedOut, recordFailedLogin, resetFailedLogins } from "./auth.lockout.utils.js";

const redisMock = vi.hoisted(() => ({
  incrWithExpiry: vi.fn(),
  del: vi.fn(),
  get: vi.fn(),
}));

vi.mock("#redis/redis.client.js", () => ({ redis: redisMock }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("recordFailedLogin", () => {
  it("increments the lockout counter for the normalized email", async () => {
    await recordFailedLogin("User@Example.com");

    expect(redisMock.incrWithExpiry).toHaveBeenCalledWith(
      expect.stringContaining("user@example.com"),
      expect.any(Number),
    );
  });

  it("does not throw when redis errors", async () => {
    redisMock.incrWithExpiry.mockRejectedValueOnce(new Error("redis down"));

    await expect(recordFailedLogin("user@example.com")).resolves.toBeUndefined();
  });
});

describe("resetFailedLogins", () => {
  it("deletes the lockout counter for the normalized email", async () => {
    await resetFailedLogins("User@Example.com");

    expect(redisMock.del).toHaveBeenCalledWith(expect.stringContaining("user@example.com"));
  });

  it("does not throw when redis errors", async () => {
    redisMock.del.mockRejectedValueOnce(new Error("redis down"));

    await expect(resetFailedLogins("user@example.com")).resolves.toBeUndefined();
  });
});

describe("isLockedOut", () => {
  it("returns false when there is no recorded failure count", async () => {
    redisMock.get.mockResolvedValueOnce(null);

    await expect(isLockedOut("user@example.com")).resolves.toBe(false);
  });

  it("returns false when the failure count is below the threshold", async () => {
    redisMock.get.mockResolvedValueOnce("3");

    await expect(isLockedOut("user@example.com")).resolves.toBe(false);
  });

  it("returns true when the failure count meets the threshold", async () => {
    redisMock.get.mockResolvedValueOnce("8");

    await expect(isLockedOut("user@example.com")).resolves.toBe(true);
  });

  it("fails open (returns false) when redis errors", async () => {
    redisMock.get.mockRejectedValueOnce(new Error("redis down"));

    await expect(isLockedOut("user@example.com")).resolves.toBe(false);
  });
});
