"use client";

import { type RefObject, useEffect } from "react";

const HEADER_HEIGHT_VAR = "--site-header-height";
const UNMEASURED_HEIGHT_PX = -1;

export const useHeaderHeightVar = (headerRef: RefObject<HTMLElement | null>): void => {
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    let pendingFrameId: number | null = null;
    let lastHeightPx = UNMEASURED_HEIGHT_PX;

    const observer = new ResizeObserver(() => {
      if (pendingFrameId !== null) return;
      pendingFrameId = requestAnimationFrame(() => {
        pendingFrameId = null;
        const heightPx = header.getBoundingClientRect().height;
        if (heightPx === lastHeightPx) return;
        lastHeightPx = heightPx;
        document.documentElement.style.setProperty(HEADER_HEIGHT_VAR, `${heightPx}px`);
      });
    });

    observer.observe(header);
    return () => {
      observer.disconnect();
      if (pendingFrameId !== null) cancelAnimationFrame(pendingFrameId);
    };
  }, [headerRef]);
};
