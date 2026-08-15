"use client";

import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@outfiqe/design-system";
import { useEffect, useState } from "react";

import { cn } from "@/shared/lib/cn";

import { PostCarouselControls } from "./PostCarouselControls";

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
