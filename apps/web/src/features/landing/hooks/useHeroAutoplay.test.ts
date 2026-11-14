import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { type HeroCarouselControls, useHeroAutoplay } from "./useHeroAutoplay";

const buildFakeCarousel = () => {
  let isAutoplaying = false;
  const listeners = new Map<string, Set<() => void>>();
  const emit = (event: string) => listeners.get(event)?.forEach((listener) => listener());
  const autoplay = {
    play: () => {
      isAutoplaying = true;
      emit("autoplay:play");
    },
    stop: () => {
      isAutoplaying = false;
      emit("autoplay:stop");
    },
    isPlaying: () => isAutoplaying,
  };
  const carousel: HeroCarouselControls = {
    on: (event, listener) =>
      listeners.set(event, (listeners.get(event) ?? new Set()).add(listener)),
    off: (event, listener) => listeners.get(event)?.delete(listener),
    plugins: () => ({ autoplay }),
  };
  return { carousel, autoplay };
};

describe("useHeroAutoplay", () => {
  it("starts the slideshow when motion is allowed and reports it as playing", () => {
    const { carousel } = buildFakeCarousel();
    const { result } = renderHook(() => useHeroAutoplay(carousel, true));

    expect(result.current.isPlaying).toBe(true);
  });

  it("never starts the slideshow for a visitor who prefers reduced motion", () => {
    const { carousel, autoplay } = buildFakeCarousel();
    const { result } = renderHook(() => useHeroAutoplay(carousel, false));

    expect(autoplay.isPlaying()).toBe(false);
    expect(result.current.isPlaying).toBe(false);
  });

  it("pauses and resumes from the visitor's button", () => {
    const { carousel, autoplay } = buildFakeCarousel();
    const { result } = renderHook(() => useHeroAutoplay(carousel, true));

    act(() => result.current.toggleAutoplay());
    expect(autoplay.isPlaying()).toBe(false);
    expect(result.current.isPlaying).toBe(false);

    act(() => result.current.toggleAutoplay());
    expect(result.current.isPlaying).toBe(true);
  });

  it("follows the slideshow when it stops on its own, such as on keyboard focus", () => {
    const { carousel, autoplay } = buildFakeCarousel();
    const { result } = renderHook(() => useHeroAutoplay(carousel, true));

    act(() => autoplay.stop());

    expect(result.current.isPlaying).toBe(false);
  });

  it("does nothing before the carousel is ready", () => {
    const { result } = renderHook(() => useHeroAutoplay(undefined, true));

    expect(result.current.isPlaying).toBe(false);
    expect(() => result.current.toggleAutoplay()).not.toThrow();
  });
});
