import { afterEach, describe, expect, it, vi } from "vitest";

import { checkReadiness } from "./readiness.utils.js";

const prismaMock = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
const redisMock = vi.hoisted(() => ({ ping: vi.fn() }));

vi.mock("#db/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("#redis/redis.client.js", () => ({ redis: redisMock }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("checkReadiness", () => {
  it("resolves when Postgres and Redis both respond", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    redisMock.ping.mockResolvedValueOnce("PONG");

    await expect(checkReadiness()).resolves.toBeUndefined();
  });

  it("rejects when Postgres is unreachable", async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error("db down"));
    redisMock.ping.mockResolvedValueOnce("PONG");

    await expect(checkReadiness()).rejects.toThrow("db down");
  });

  it("rejects when Redis is unreachable", async () => {
    prismaMock.$queryRaw.mockResolvedValueOnce([{ ok: 1 }]);
    redisMock.ping.mockRejectedValueOnce(new Error("redis down"));

    await expect(checkReadiness()).rejects.toThrow("redis down");
  });
});
