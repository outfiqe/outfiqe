import { createHash } from "node:crypto";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { stubMatchMedia } from "./testing/setup";
import { useTheme } from "./theme";
import {
  DARK_CLASS,
  THEME_INIT_SCRIPT,
  THEME_INIT_SCRIPT_SHA256,
  THEME_STORAGE_KEY,
} from "./theme-init";

describe("THEME_INIT_SCRIPT_SHA256", () => {
  it("matches the current theme init script so a CSP hash can allow it", () => {
    const digest = createHash("sha256").update(THEME_INIT_SCRIPT, "utf8").digest("base64");
    expect(THEME_INIT_SCRIPT_SHA256).toBe(`sha256-${digest}`);
  });
});

describe("useTheme", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    window.localStorage.clear();
    document.documentElement.classList.remove(DARK_CLASS);
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove(DARK_CLASS);
  });

  it("reconciles the html class to the stored theme when the boot script never ran", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
  });

  it("falls back to the OS preference when nothing is stored", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
  });

  it("toggles to dark on the first click from a light page", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("toggles back to light from a dark page", () => {
    document.documentElement.classList.add(DARK_CLASS);
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("light");
    expect(document.documentElement.classList.contains(DARK_CLASS)).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("keeps every mounted consumer in sync through one shared store", () => {
    const first = renderHook(() => useTheme());
    const second = renderHook(() => useTheme());

    act(() => {
      first.result.current.toggleTheme();
    });

    expect(first.result.current.theme).toBe("dark");
    expect(second.result.current.theme).toBe("dark");
  });
});
