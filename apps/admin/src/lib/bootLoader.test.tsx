import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BOOT_LOADER_FADE_MS,
  BOOT_LOADER_HIDDEN_CLASS,
  BOOT_LOADER_ID,
  hideBootLoader,
  useHideBootLoader,
} from "./bootLoader";

const addBootLoader = () => {
  const bootLoader = document.createElement("div");
  bootLoader.id = BOOT_LOADER_ID;
  document.body.appendChild(bootLoader);
  return bootLoader;
};

const HidesBootLoader = () => {
  useHideBootLoader();
  return null;
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.getElementById(BOOT_LOADER_ID)?.remove();
});

describe("hideBootLoader", () => {
  it("fades the loader out and then removes it from the page", () => {
    const bootLoader = addBootLoader();

    hideBootLoader();

    expect(bootLoader).toHaveClass(BOOT_LOADER_HIDDEN_CLASS);
    expect(document.getElementById(BOOT_LOADER_ID)).not.toBeNull();

    vi.advanceTimersByTime(BOOT_LOADER_FADE_MS);

    expect(document.getElementById(BOOT_LOADER_ID)).toBeNull();
  });

  it("does nothing when the loader is already gone", () => {
    expect(() => hideBootLoader()).not.toThrow();
  });
});

describe("useHideBootLoader", () => {
  it("hides the loader once the component that uses it has mounted", () => {
    const bootLoader = addBootLoader();

    render(<HidesBootLoader />);

    expect(bootLoader).toHaveClass(BOOT_LOADER_HIDDEN_CLASS);
  });
});
