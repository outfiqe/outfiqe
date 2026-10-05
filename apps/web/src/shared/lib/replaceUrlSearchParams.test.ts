import { beforeEach, describe, expect, it, vi } from "vitest";

import { replaceUrlSearchParams } from "./replaceUrlSearchParams";

beforeEach(() => window.history.replaceState(null, "", "/explore?tab=builds#feed"));

describe("replaceUrlSearchParams", () => {
  it("changes the query in place and keeps the path, the other params and the hash", () => {
    const historyLength = window.history.length;

    replaceUrlSearchParams((params) => params.set("style", "formal"));

    expect(window.location.pathname).toBe("/explore");
    expect(window.location.search).toBe("?tab=builds&style=formal");
    expect(window.location.hash).toBe("#feed");
    expect(window.history.length).toBe(historyLength);
  });

  it("passes no state object, so Next's router picks up the new URL", () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    replaceUrlSearchParams((params) => params.set("tab", "people"));

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/explore?tab=people#feed");
    replaceStateSpy.mockRestore();
  });

  it("drops the question mark when no params are left", () => {
    replaceUrlSearchParams((params) => params.delete("tab"));

    expect(window.location.href.endsWith("/explore#feed")).toBe(true);
  });
});
