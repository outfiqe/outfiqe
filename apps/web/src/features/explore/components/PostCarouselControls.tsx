"use client";

import { useCarousel } from "@outfiqe/design-system";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type MouseEvent } from "react";

import { cn } from "@/shared/lib/cn";

type PostCarouselControlsProps = {
  imageCount: number;
  index: number;
};

export const PostCarouselControls = ({ imageCount, index }: PostCarouselControlsProps) => {
  const { scrollPrev, scrollNext, canScrollPrev, canScrollNext } = useCarousel();

  const stopAnd = (handler: () => void) => (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  };

  return (
    <>
      {canScrollPrev && (
        <button
          type="button"
          onClick={stopAnd(scrollPrev)}
          aria-label="Previous photo"
          className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100"
        >
          <ChevronLeft className="size-4" />
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={stopAnd(scrollNext)}
          aria-label="Next photo"
          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover/carousel:opacity-100"
        >
          <ChevronRight className="size-4" />
        </button>
      )}

      <span className="absolute right-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10.5px] font-semibold text-white">
        {index + 1}/{imageCount}
      </span>

      <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1">
        {Array.from({ length: imageCount }, (_, i) => (
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
  );
};
