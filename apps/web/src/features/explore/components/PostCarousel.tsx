"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  useCarousel,
} from "@outfiqe/design-system";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";

import { cn } from "@/shared/lib/cn";

type PostCarouselProps = {
  images: string[];
  fallbackColor: string;
  aspectRatio?: string;
  className?: string;
};

type PostCarouselControlsProps = {
  imageCount: number;
  index: number;
};

const PostCarouselControls = ({ imageCount, index }: PostCarouselControlsProps) => {
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

export const PostCarousel = ({
  images,
  fallbackColor,
  aspectRatio,
  className,
}: PostCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    queueMicrotask(onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (images.length === 0) {
    return (
      <div
        className={cn("overflow-hidden", className)}
        style={{ ...(aspectRatio ? { aspectRatio } : {}), backgroundColor: fallbackColor }}
      />
    );
  }

  return (
    <Carousel
      setApi={setApi}
      opts={{ watchDrag: hasMultiple }}
      className={cn(
        "group/carousel touch-pan-y select-none",
        hasMultiple && "cursor-grab active:cursor-grabbing",
        className,
      )}
    >
      <CarouselContent className="ml-0">
        {images.map((url, i) => (
          <CarouselItem key={`${url}-${i}`} className="pl-0">
            <div
              className="size-full bg-cover bg-center"
              style={{ ...(aspectRatio ? { aspectRatio } : {}), backgroundImage: `url(${url})` }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>

      {hasMultiple && <PostCarouselControls imageCount={images.length} index={index} />}
    </Carousel>
  );
};
