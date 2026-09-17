"use client";

import { Carousel, type CarouselApi, CarouselContent, CarouselItem } from "@outfiqe/design-system";
import { Flame } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";

import { AppImage } from "@/shared/components/AppImage";
import { cn } from "@/shared/lib/cn";

import { PostCarouselControls } from "./PostCarouselControls";

const DEFAULT_POST_CAROUSEL_SIZES = "(min-width: 768px) 50vw, 100vw";
const DOUBLE_TAP_THRESHOLD_MS = 300;

type LikeBurstSparkLayout = { angle: number; distance: number; delayMs: number };
type LikeBurstSpark = LikeBurstSparkLayout & { size: number };

const LIKE_BURST_SPARK_LAYOUT: LikeBurstSparkLayout[] = [
  { angle: -90, distance: 62, delayMs: 0 },
  { angle: -60, distance: 78, delayMs: 40 },
  { angle: -30, distance: 58, delayMs: 15 },
  { angle: 0, distance: 82, delayMs: 55 },
  { angle: 30, distance: 65, delayMs: 25 },
  { angle: 60, distance: 76, delayMs: 60 },
  { angle: 90, distance: 60, delayMs: 10 },
  { angle: 120, distance: 80, delayMs: 50 },
  { angle: 150, distance: 63, delayMs: 20 },
  { angle: 180, distance: 74, delayMs: 65 },
  { angle: 210, distance: 59, delayMs: 5 },
  { angle: 240, distance: 79, delayMs: 45 },
];

const MIN_SPARK_SIZE_PX = 4;
const MAX_SPARK_SIZE_PX = 9;

const randomSparkSize = () =>
  Math.round(MIN_SPARK_SIZE_PX + Math.random() * (MAX_SPARK_SIZE_PX - MIN_SPARK_SIZE_PX));

const rollLikeBurstSparks = (): LikeBurstSpark[] =>
  LIKE_BURST_SPARK_LAYOUT.map((spark) => ({ ...spark, size: randomSparkSize() }));

type PostCarouselProps = {
  images: string[];
  fallbackColor: string;
  aspectRatio?: string;
  sizes?: string;
  className?: string;
  onImageClick?: () => void;
  onDoubleTapLike?: () => void;
};

export const PostCarousel = ({
  images,
  fallbackColor,
  aspectRatio,
  sizes = DEFAULT_POST_CAROUSEL_SIZES,
  className,
  onImageClick,
  onDoubleTapLike,
}: PostCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [burstToken, setBurstToken] = useState<number | null>(null);
  const [burstSparks, setBurstSparks] = useState<LikeBurstSpark[]>([]);
  const hasMultiple = images.length > 1;
  const lastTapAtRef = useRef(0);
  const pendingSingleTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    queueMicrotask(onSelect);
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(
    () => () => {
      if (pendingSingleTapRef.current) clearTimeout(pendingSingleTapRef.current);
    },
    [],
  );

  const handleTap = () => {
    const tappedAt = Date.now();
    const isDoubleTap = tappedAt - lastTapAtRef.current < DOUBLE_TAP_THRESHOLD_MS;

    if (isDoubleTap) {
      if (pendingSingleTapRef.current) {
        clearTimeout(pendingSingleTapRef.current);
        pendingSingleTapRef.current = null;
      }
      lastTapAtRef.current = 0;
      if (onDoubleTapLike) {
        onDoubleTapLike();
        setBurstSparks(rollLikeBurstSparks());
        setBurstToken(tappedAt);
      }
      return;
    }

    lastTapAtRef.current = tappedAt;
    if (onImageClick) {
      pendingSingleTapRef.current = setTimeout(() => {
        pendingSingleTapRef.current = null;
        onImageClick();
      }, DOUBLE_TAP_THRESHOLD_MS);
    }
  };

  if (images.length === 0) {
    return (
      <div
        className={cn("overflow-hidden", className)}
        style={{ ...(aspectRatio ? { aspectRatio } : {}), backgroundColor: fallbackColor }}
      />
    );
  }

  return (
    <div onClick={handleTap} className={cn("relative", onImageClick && "cursor-pointer")}>
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

      {burstToken !== null && (
        <div key={burstToken} className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Flame
              aria-hidden
              onAnimationEnd={() => setBurstToken(null)}
              className="size-24 animate-like-burst-flame fill-primary stroke-primary drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
            />
          </div>

          <div className="absolute left-1/2 top-1/2">
            {burstSparks.map((spark, i) => {
              const angleRad = (spark.angle * Math.PI) / 180;
              const tx = Math.round(Math.cos(angleRad) * spark.distance);
              const ty = Math.round(Math.sin(angleRad) * spark.distance);
              return (
                <span
                  key={i}
                  aria-hidden
                  className="absolute animate-like-burst-spark rounded-full bg-primary"
                  style={
                    {
                      width: spark.size,
                      height: spark.size,
                      marginLeft: -spark.size / 2,
                      marginTop: -spark.size / 2,
                      animationDelay: `${spark.delayMs}ms`,
                      "--tx": `${tx}px`,
                      "--ty": `${ty}px`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
