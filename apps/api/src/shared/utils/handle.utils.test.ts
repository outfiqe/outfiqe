import { describe, expect, it, vi } from "vitest";

import { HandleCollisionError, runWithHandleCollisionRetry } from "./handle.utils.js";

const MAX_COLLISION_ATTEMPTS = 5;

describe("runWithHandleCollisionRetry", () => {
  it("returns the result of an operation that succeeds first time", async () => {
    const operation = vi.fn().mockResolvedValue("created");

    await expect(runWithHandleCollisionRetry(operation)).resolves.toBe("created");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries the whole operation after a handle collision and returns its eventual result", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new HandleCollisionError())
      .mockRejectedValueOnce(new HandleCollisionError())
      .mockResolvedValue("created");

    await expect(runWithHandleCollisionRetry(operation)).resolves.toBe("created");
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("gives up with the collision error once every attempt has collided", async () => {
    const operation = vi.fn().mockRejectedValue(new HandleCollisionError());

    await expect(runWithHandleCollisionRetry(operation)).rejects.toBeInstanceOf(
      HandleCollisionError,
    );
    expect(operation).toHaveBeenCalledTimes(MAX_COLLISION_ATTEMPTS);
  });

  it("does not retry an unrelated failure", async () => {
    const unrelatedFailure = new Error("database is down");
    const operation = vi.fn().mockRejectedValue(unrelatedFailure);

    await expect(runWithHandleCollisionRetry(operation)).rejects.toBe(unrelatedFailure);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
