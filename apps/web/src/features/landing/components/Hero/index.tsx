"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/design-system/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/design-system/components/ui/carousel";
import { cn } from "@/shared/lib/cn";
import { HERO_SLIDES } from "./hero.constants";

const hasMultipleSlides = HERO_SLIDES.length > 1;

export function Hero() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    queueMicrotask(onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  return (
    <section className="pb-4 sm:px-6 lg:px-10">
      <Carousel
        opts={{ loop: hasMultipleSlides }}
        plugins={[Autoplay({ delay: 4000 })]}
        setApi={setApi}
        className="overflow-hidden rounded-none sm:rounded-3xl"
      >
        <CarouselContent className="ml-0">
          {HERO_SLIDES.map((slide, i) => (
            <CarouselItem key={slide.id} inert={i !== selectedIndex} className="pl-0">
              <div
                className={cn(
                  "flex h-48 flex-col justify-center bg-cover bg-center px-4 py-4 sm:h-105 sm:px-12 sm:py-10 lg:px-16",
                  !slide.image && "bg-linear-to-r from-[#241006] via-[#7a3010] to-primary",
                )}
                style={
                  slide.image
                    ? {
                        backgroundImage: `linear-gradient(to right, rgba(20,16,14,0.8), rgba(20,16,14,0.25)), url(${slide.image})`,
                      }
                    : undefined
                }
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-background/70 sm:text-xs">
                  {slide.tag}
                </span>
                <h1 className="mt-1.5 max-w-xl whitespace-pre-line font-display text-xl font-extrabold uppercase leading-[0.95] text-background sm:mt-3 sm:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
                <p className="mt-2 max-w-md text-xs text-background/80 sm:mt-4 sm:text-base">
                  {slide.description}
                </p>

                <div className="mt-3 sm:mt-6">
                  <Button
                    size="default"
                    className="h-9 px-4 text-xs sm:h-11 sm:px-7 sm:text-base"
                    asChild
                  >
                    <Link href={slide.cta.href}>
                      {slide.cta.label}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {hasMultipleSlides && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => api?.scrollPrev()}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 hidden -translate-y-1/2 bg-background/15 text-background hover:bg-background/25 sm:flex"
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => api?.scrollNext()}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 hidden -translate-y-1/2 bg-background/15 text-background hover:bg-background/25 sm:flex"
            >
              <ChevronRight className="size-5" />
            </Button>

            <div className="absolute bottom-5 right-8 hidden flex-col items-end gap-2.5 sm:flex">
              {HERO_SLIDES.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === selectedIndex}
                  className="flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "h-px transition-all",
                      i === selectedIndex ? "w-8 bg-background" : "w-4 bg-background/40",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-bold",
                      i === selectedIndex ? "text-background" : "text-background/40",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </Carousel>
    </section>
  );
}
