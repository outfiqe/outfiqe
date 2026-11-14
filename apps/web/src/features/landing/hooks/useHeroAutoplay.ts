"use client";

import { useEffect, useState } from "react";

type AutoplayControls = {
  play: () => void;
  stop: () => void;
  isPlaying: () => boolean;
};

type AutoplayEvent = "autoplay:play" | "autoplay:stop";

export type HeroCarouselControls = {
  on(event: AutoplayEvent, listener: () => void): unknown;
  off(event: AutoplayEvent, listener: () => void): unknown;
  plugins(): { autoplay?: AutoplayControls };
};

export const useHeroAutoplay = (
  carousel: HeroCarouselControls | undefined,
  shouldStartPlaying: boolean,
) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const autoplay = carousel?.plugins().autoplay;
    if (!carousel || !autoplay) return;

    const syncPlayingState = () => setIsPlaying(autoplay.isPlaying());
    carousel.on("autoplay:play", syncPlayingState);
    carousel.on("autoplay:stop", syncPlayingState);
    if (shouldStartPlaying) autoplay.play();
    else autoplay.stop();
    syncPlayingState();

    return () => {
      carousel.off("autoplay:play", syncPlayingState);
      carousel.off("autoplay:stop", syncPlayingState);
    };
  }, [carousel, shouldStartPlaying]);

  const toggleAutoplay = () => {
    const autoplay = carousel?.plugins().autoplay;
    if (!autoplay) return;
    if (autoplay.isPlaying()) autoplay.stop();
    else autoplay.play();
  };

  return { isPlaying, toggleAutoplay };
};
