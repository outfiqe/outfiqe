"use client";

import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@outfiqe/design-system";
import { useEffect, useState } from "react";

import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";

import { PostCarouselControls } from "./PostCarouselControls";

const DEFAULT_POST_CAROUSEL_SIZES = "(min-width: 768px) 50vw, 100vw";

type PostCarouselProps = {
  images: string[];
  fallbackColor: string;
  aspectRatio?: string;
  sizes?: string;
  className?: string;
};

export const PostCarousel = ({
  images,
  fallbackColor,
  aspectRatio,
  sizes = DEFAULT_POST_CAROUSEL_SIZES,
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
            <div className="relative size-full" style={aspectRatio ? { aspectRatio } : undefined}>
              <AppImage src={url} alt="" fill sizes={sizes} eager={i === 0} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {hasMultiple && <PostCarouselControls imageCount={images.length} index={index} />}
    </Carousel>
  );
};
