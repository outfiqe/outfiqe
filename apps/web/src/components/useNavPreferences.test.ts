import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useNavPreferences } from "./useNavPreferences";

const STORAGE_KEY = "outfiqe:dashboard-nav-pins";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useNavPreferences", () => {
  it("starts uncustomized", () => {
    const { result } = renderHook(() => useNavPreferences());
    expect(result.current.pinnedIds).toBeNull();
    expect(result.current.isCustomized).toBe(false);
  });

  it("persists a saved selection to localStorage", () => {
    const { result } = renderHook(() => useNavPreferences());

    act(() => result.current.save(["profile", "overview"]));

    expect(result.current.pinnedIds).toEqual(["profile", "overview"]);
    expect(result.current.isCustomized).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual([
      "profile",
      "overview",
    ]);
  });

  it("clears the selection on reset", () => {
    const { result } = renderHook(() => useNavPreferences());
    act(() => result.current.save(["profile"]));
    act(() => result.current.reset());

    expect(result.current.pinnedIds).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps separate hook instances in sync", () => {
    const first = renderHook(() => useNavPreferences());
    const second = renderHook(() => useNavPreferences());

    act(() => first.result.current.save(["badges", "profile"]));

    expect(second.result.current.pinnedIds).toEqual(["badges", "profile"]);
  });

  it("ignores an unparseable stored value", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    const { result } = renderHook(() => useNavPreferences());
    expect(result.current.pinnedIds).toBeNull();
  });
});
