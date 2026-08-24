import { describe, expect, it, vi } from "vitest";

import { settleIds } from "./lifecycle-sweep.utils.js";

describe("settleIds", () => {
  it("counts only the ids that settle successfully", async () => {
    const settle = vi.fn(async (id: string) => id !== "skip-me");
    const onError = vi.fn(() => "unused");

    const count = await settleIds(["a", "skip-me", "b"], settle, onError);

    expect(count).toBe(2);
    expect(onError).not.toHaveBeenCalled();
  });

  it("logs and continues past an id whose settle call throws", async () => {
    const settle = vi.fn(async (id: string) => {
      if (id === "boom") throw new Error("settle failed");
      return true;
    });
    const onError = vi.fn(
      (id: string, error: unknown) => `failed to settle ${id}: ${String(error)}`,
    );

    const count = await settleIds(["a", "boom", "b"], settle, onError);

    expect(count).toBe(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("boom", expect.any(Error));
  });
});
