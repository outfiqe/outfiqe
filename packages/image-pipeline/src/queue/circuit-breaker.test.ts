import { describe, expect, it, vi } from "vitest";

import { CircuitBreaker } from "./circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("does not pause before the failure threshold is reached", async () => {
    const pauseQueue = vi.fn();
    const resumeQueue = vi.fn();
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, cooldownMs: 1000 },
      { pauseQueue, resumeQueue },
    );

    await breaker.recordFailure();
    await breaker.recordFailure();

    expect(pauseQueue).not.toHaveBeenCalled();
    expect(breaker.isTripped()).toBe(false);
  });

  it("pauses the queue once the failure threshold is reached", async () => {
    const pauseQueue = vi.fn();
    const resumeQueue = vi.fn();
    const scheduleResume = vi.fn();
    const breaker = new CircuitBreaker(
      { failureThreshold: 3, cooldownMs: 1000 },
      { pauseQueue, resumeQueue, scheduleResume },
    );

    await breaker.recordFailure();
    await breaker.recordFailure();
    await breaker.recordFailure();

    expect(pauseQueue).toHaveBeenCalledTimes(1);
    expect(breaker.isTripped()).toBe(true);
    expect(scheduleResume).toHaveBeenCalledWith(expect.any(Function), 1000);
  });

  it("does not re-trip (or re-pause) while already tripped", async () => {
    const pauseQueue = vi.fn();
    const resumeQueue = vi.fn();
    const scheduleResume = vi.fn();
    const breaker = new CircuitBreaker(
      { failureThreshold: 2, cooldownMs: 1000 },
      { pauseQueue, resumeQueue, scheduleResume },
    );

    await breaker.recordFailure();
    await breaker.recordFailure();
    await breaker.recordFailure();
    await breaker.recordFailure();

    expect(pauseQueue).toHaveBeenCalledTimes(1);
  });

  it("resumes the queue and resets state once the scheduled cooldown fires", async () => {
    const pauseQueue = vi.fn();
    const resumeQueue = vi.fn();
    let cooldownCallback: (() => void) | undefined;
    const scheduleResume = vi.fn((callback: () => void) => {
      cooldownCallback = callback;
    });
    const breaker = new CircuitBreaker(
      { failureThreshold: 1, cooldownMs: 500 },
      { pauseQueue, resumeQueue, scheduleResume },
    );

    await breaker.recordFailure();
    expect(breaker.isTripped()).toBe(true);

    cooldownCallback?.();

    expect(resumeQueue).toHaveBeenCalledTimes(1);
    expect(breaker.isTripped()).toBe(false);
  });

  it("resets the failure count on success", async () => {
    const pauseQueue = vi.fn();
    const resumeQueue = vi.fn();
    const breaker = new CircuitBreaker(
      { failureThreshold: 2, cooldownMs: 1000 },
      { pauseQueue, resumeQueue },
    );

    await breaker.recordFailure();
    breaker.recordSuccess();
    await breaker.recordFailure();

    expect(pauseQueue).not.toHaveBeenCalled();
  });
});
