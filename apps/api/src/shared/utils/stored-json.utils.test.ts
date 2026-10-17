import { describe, expect, it } from "vitest";

import { toStoredJson } from "./stored-json.utils.js";

const FALLBACK = { note: "unreadable" };

describe("toStoredJson", () => {
  it("keeps plain JSON values as they are", () => {
    expect(toStoredJson({ status: "Delivered", attempts: [1, 2] }, FALLBACK)).toEqual({
      status: "Delivered",
      attempts: [1, 2],
    });
  });

  it("uses the fallback for null, missing or non-JSON values", () => {
    expect(toStoredJson(null, FALLBACK)).toBe(FALLBACK);
    expect(toStoredJson(undefined, FALLBACK)).toBe(FALLBACK);
    expect(toStoredJson({ when: new Date() }, FALLBACK)).toBe(FALLBACK);
  });
});
