"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "./cn";

const SCROLL_END_TOLERANCE_PX = 4;
const SCROLL_STEP_SHARE = 0.75;
const START_OF_ROW = 0;
const BACKWARD = -1;
const FORWARD = 1;

type ScrollDirection = typeof BACKWARD | typeof FORWARD;

export type ScrollRowSurface = "page" | "card";

const FADE_FROM_SURFACE: Record<ScrollRowSurface, string> = {
  page: "from-background",
  card: "from-card",
};

export interface ScrollRowProps {
  children: ReactNode;
  label: string;
  scrollBackLabel?: string;
  scrollForwardLabel?: string;
  surface?: ScrollRowSurface;
  className?: string;
}

const ArrowButton = ({
  direction,
  label,
  onScroll,
}: {
  direction: ScrollDirection;
  label: string;
  onScroll: (direction: ScrollDirection) => void;
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={() => onScroll(direction)}
    className={cn(
      "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm",
      "outline-none focus-visible:ring-2 focus-visible:ring-ring",
      direction === BACKWARD ? "left-0" : "right-0",
    )}
  >
    {direction === BACKWARD ? (
      <ChevronLeft className="size-4" aria-hidden />
    ) : (
      <ChevronRight className="size-4" aria-hidden />
    )}
  </button>
);

export const ScrollRow = ({
  children,
  label,
  scrollBackLabel = "Scroll back",
  scrollForwardLabel = "Scroll forward",
  surface = "page",
  className,
}: ScrollRowProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const measureOverflow = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const { scrollLeft, clientWidth, scrollWidth } = scroller;
    setCanScrollBack(scrollLeft > START_OF_ROW);
    setCanScrollForward(scrollLeft + clientWidth < scrollWidth - SCROLL_END_TOLERANCE_PX);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    measureOverflow();
    const resizeObserver = new ResizeObserver(measureOverflow);
    resizeObserver.observe(scroller);
    Array.from(scroller.children).forEach((child) => resizeObserver.observe(child));
    return () => resizeObserver.disconnect();
  }, [children, measureOverflow]);

  const scrollByStep = (direction: ScrollDirection) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * scroller.clientWidth * SCROLL_STEP_SHARE,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        ref={scrollerRef}
        role="group"
        aria-label={label}
        onScroll={measureOverflow}
        className={cn(
          "flex items-center gap-2 overflow-x-auto py-1",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children}
      </div>
      {canScrollBack && (
        <>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r to-transparent",
              FADE_FROM_SURFACE[surface],
            )}
          />
          <ArrowButton direction={BACKWARD} label={scrollBackLabel} onScroll={scrollByStep} />
        </>
      )}
      {canScrollForward && (
        <>
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l to-transparent",
              FADE_FROM_SURFACE[surface],
            )}
          />
          <ArrowButton direction={FORWARD} label={scrollForwardLabel} onScroll={scrollByStep} />
        </>
      )}
    </div>
  );
};
