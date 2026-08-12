"use client";

import { useEffect, useState } from "react";

const DEFAULT_SCROLL_THRESHOLD = 8;

export const useHeaderCondense = (
  threshold: number = DEFAULT_SCROLL_THRESHOLD,
  enabled = true,
): boolean => {
  const [isCondensed, setIsCondensed] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let ticking = false;
    const update = () => {
      setIsCondensed(window.scrollY > threshold);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold, enabled]);

  return enabled && isCondensed;
};
