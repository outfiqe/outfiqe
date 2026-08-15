"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";

const SWIPE_THRESHOLD_PX = 40;

type PostCarouselProps = {
  images: string[];
  fallbackColor: string;
  aspectRatio?: string;
  className?: string;
};

export const PostCarousel = ({
  images,
  fallbackColor,
  aspectRatio,
  className,
}: PostCarouselProps) => {
  const [index, setIndex] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const hasMultiple = images.length > 1;

  const goTo = (next: number) => setIndex(Math.min(Math.max(next, 0), images.length - 1));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    dragStartX.current = event.clientX;
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    goTo(delta > 0 ? index - 1 : index + 1);
  };

  return (
    <div
      className={cn(
        "group/carousel relative touch-pan-y select-none overflow-hidden",
        hasMultiple && "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{
        ...(aspectRatio ? { aspectRatio } : {}),
        backgroundColor: images.length === 0 ? fallbackColor : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <div
        className="flex size-full transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="size-full shrink-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${url})` }}
          />
        ))}
      </div>

      {hasMultiple && (
        <>
          {index > 0 && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goTo(index - 1);
              }}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goTo(index + 1);
              }}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100"
            >
              <ChevronRight className="size-4" />
            </button>
          )}

          <span className="absolute right-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-semibold text-white">
            {index + 1}/{images.length}
          </span>

          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === index ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
