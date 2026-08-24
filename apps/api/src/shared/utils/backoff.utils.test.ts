import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeBackoffDelayMs, waitMs } from "./backoff.utils.js";

describe("computeBackoffDelayMs", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the base delay with no jitter on the first attempt", () => {
    expect(computeBackoffDelayMs(0)).toBe(200);
  });

  it("doubles the delay for each subsequent attempt", () => {
    expect(computeBackoffDelayMs(1)).toBe(400);
    expect(computeBackoffDelayMs(2)).toBe(800);
  });

  it("caps the delay at the configured maximum", () => {
    expect(computeBackoffDelayMs(20)).toBe(10_000);
  });

  it("adds positive jitter on top of the exponential delay", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    expect(computeBackoffDelayMs(0)).toBe(200 + 200 * 0.2);
  });
});

describe("waitMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves only after the given number of milliseconds", async () => {
    let resolved = false;
    void waitMs(500).then(() => {
      resolved = true;
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
  });
});
