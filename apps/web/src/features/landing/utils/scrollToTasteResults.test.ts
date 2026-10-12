import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { scrollToTasteResults, TASTE_RESULTS_SECTION_ID } from "./scrollToTasteResults";

const mockReducedMotionPreference = (prefersReducedMotion: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: prefersReducedMotion })),
  );
};

describe("scrollToTasteResults", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    document.body.innerHTML = `<section id="${TASTE_RESULTS_SECTION_ID}"></section>`;
    document.getElementById(TASTE_RESULTS_SECTION_ID)!.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    scrollIntoView.mockReset();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("smooth-scrolls the results section to the top of the viewport", () => {
    mockReducedMotionPreference(false);

    scrollToTasteResults();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("jumps without animation when the visitor prefers reduced motion", () => {
    mockReducedMotionPreference(true);

    scrollToTasteResults();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("does nothing when the results section is not on the page", () => {
    mockReducedMotionPreference(false);
    document.body.innerHTML = "";

    expect(() => scrollToTasteResults()).not.toThrow();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
