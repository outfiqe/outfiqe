import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { AppError } from "./error-handler.js";
import { readRequiredIdempotencyKey, requireIdempotencyKey } from "./require-idempotency-key.js";

const requestWithKey = (key: string | undefined) =>
  ({ get: (header: string) => (header === "Idempotency-Key" ? key : undefined) }) as Request;

describe("readRequiredIdempotencyKey", () => {
  it("returns a well-formed key", () => {
    const key = "4f7c2c1e-9b1a-4d4f-8a3b-0d1e2f3a4b5c";
    expect(readRequiredIdempotencyKey(requestWithKey(key))).toBe(key);
  });

  it("refuses a missing, too short, too long or oddly shaped key", () => {
    for (const key of [
      undefined,
      "",
      "short",
      "x".repeat(129),
      "has spaces in it",
      "semi;colon12",
    ]) {
      expect(() => readRequiredIdempotencyKey(requestWithKey(key))).toThrow(AppError);
    }
  });
});

describe("requireIdempotencyKey", () => {
  it("lets a request with a key through and stops one without", () => {
    const next = vi.fn();
    const response = {} as Response;

    requireIdempotencyKey(requestWithKey("valid_key_123"), response, next);
    expect(next).toHaveBeenLastCalledWith();

    requireIdempotencyKey(requestWithKey(undefined), response, next);
    const [error] = next.mock.lastCall ?? [];
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: "IDEMPOTENCY_KEY_REQUIRED", status: 400 });
  });
});
