import { afterEach, describe, expect, it, vi } from "vitest";

import { generateUuid } from "./index";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const fakeGetRandomValues = (array: Uint8Array): Uint8Array => {
  for (let index = 0; index < array.length; index += 1) {
    array[index] = Math.floor(Math.random() * 256);
  }
  return array;
};

describe("generateUuid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when it's available", () => {
    const nativeUuid = "11111111-1111-4111-8111-111111111111";
    vi.stubGlobal("crypto", { randomUUID: () => nativeUuid });

    expect(generateUuid()).toBe(nativeUuid);
  });

  it("falls back to a hand-built v4 UUID when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", { getRandomValues: fakeGetRandomValues });

    const id = generateUuid();

    expect(id).toMatch(UUID_V4_PATTERN);
  });

  it("falls back to Math.random when crypto is entirely unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    const id = generateUuid();

    expect(id).toMatch(UUID_V4_PATTERN);
  });

  it("generates distinct ids across calls", () => {
    vi.stubGlobal("crypto", { getRandomValues: fakeGetRandomValues });

    const ids = new Set(Array.from({ length: 20 }, () => generateUuid()));

    expect(ids.size).toBe(20);
  });
});
