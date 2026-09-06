import { afterEach, describe, expect, it, vi } from "vitest";

import { generateUuid } from "./index";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateUuid", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses crypto.randomUUID when it's available", () => {
    const nativeUuid = "11111111-1111-4111-8111-111111111111";
    vi.spyOn(crypto, "randomUUID").mockReturnValue(nativeUuid);

    expect(generateUuid()).toBe(nativeUuid);
  });

  it("falls back to a hand-built v4 UUID when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const id = generateUuid();

    expect(id).toMatch(UUID_V4_PATTERN);
  });

  it("falls back to Math.random when getRandomValues is also unavailable", () => {
    vi.stubGlobal("crypto", undefined);

    const id = generateUuid();

    expect(id).toMatch(UUID_V4_PATTERN);
  });

  it("generates distinct ids across calls", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });

    const ids = new Set(Array.from({ length: 20 }, () => generateUuid()));

    expect(ids.size).toBe(20);
  });
});
