import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useTastePreferences } from "./useTastePreferences";

const STORAGE_KEY = "outfiqe:taste-categories";

describe("useTastePreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reports no customization when localStorage is empty", () => {
    const { result } = renderHook(() => useTastePreferences());
    expect(result.current.isCustomized).toBe(false);
    expect(result.current.storedSlugs).toBeNull();
  });

  it("reads a stored slug list", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["b", "a"]));
    const { result } = renderHook(() => useTastePreferences());
    expect(result.current.storedSlugs).toEqual(["b", "a"]);
    expect(result.current.isCustomized).toBe(true);
  });

  it("ignores a malformed stored value", () => {
    window.localStorage.setItem(STORAGE_KEY, "not json");
    const { result } = renderHook(() => useTastePreferences());
    expect(result.current.isCustomized).toBe(false);
  });

  it("persists and clears the selection", () => {
    const { result } = renderHook(() => useTastePreferences());

    act(() => result.current.save(["x", "y"]));
    expect(result.current.storedSlugs).toEqual(["x", "y"]);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual(["x", "y"]);

    act(() => result.current.reset());
    expect(result.current.storedSlugs).toBeNull();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
