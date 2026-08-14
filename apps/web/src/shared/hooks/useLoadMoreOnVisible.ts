"use client";

import { useEffect, useRef } from "react";

const ROOT_MARGIN = "400px";

export const useLoadMoreOnVisible = (onVisible: () => void, enabled: boolean) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible();
      },
      { rootMargin: ROOT_MARGIN },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [onVisible, enabled]);

  return sentinelRef;
};
