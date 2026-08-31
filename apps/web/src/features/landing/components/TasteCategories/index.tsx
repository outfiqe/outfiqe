"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { getAvatarColor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

const SCROLL_STEP_PX = 320;
const SCROLL_END_TOLERANCE_PX = 1;

type PendingCategory = { slug: string; fromSearchParams: string };

export const TasteCategories = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categories = useCategories();
  const [pendingCategory, setPendingCategory] = useState<PendingCategory | null>(null);
  const searchParamsString = searchParams.toString();
  const resolvedSlug = searchParams.get("category") ?? categories.data?.[0]?.slug;
  const isNavigating = pendingCategory?.fromSearchParams === searchParamsString;
  const activeSlug = isNavigating && pendingCategory ? pendingCategory.slug : resolvedSlug;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollability = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    setCanScrollPrev(scroller.scrollLeft > 0);
    setCanScrollNext(
      scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - SCROLL_END_TOLERANCE_PX,
    );
  };

  useEffect(() => {
    updateScrollability();
    window.addEventListener("resize", updateScrollability);
    return () => window.removeEventListener("resize", updateScrollability);
  }, [categories.data]);

  const scrollByStep = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: "smooth" });
  };

  const selectCategory = (slug: string) => {
    setPendingCategory({ slug, fromSearchParams: searchParamsString });
    router.replace(`/?category=${slug}`, { scroll: false });
  };

  if (!categories.isLoading && categories.data?.length === 0) {
    return null;
  }

  return (
    <section className="px-6 pb-4 pt-4 sm:pb-6 sm:pt-6 lg:px-10">
      <span className="text-xs font-bold uppercase tracking-widest text-primary-strong">
        Start here
      </span>
      <h2 className="mt-2 font-display text-2xl font-bold text-foreground sm:text-3xl">
        Explore your taste
      </h2>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Pick a look you like. We&apos;ll show you what fits it, across every brand we carry.
      </p>

      <div className="relative mt-5">
        <div
          ref={scrollerRef}
          onScroll={updateScrollability}
          aria-busy={isNavigating}
          className={cn(
            "-mx-2 flex gap-3 p-2",
            "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            categories.isLoading ? "overflow-x-hidden" : "overflow-x-auto",
          )}
        >
          {categories.isLoading &&
            Array.from({ length: 20 }).map((_, index) => (
              <Skeleton key={index} className="size-28 shrink-0 rounded-2xl sm:size-32" />
            ))}

          {categories.data?.map((category) => (
            <Button
              key={category.slug}
              variant="ghost"
              onClick={() => selectCategory(category.slug)}
              style={
                category.imageUrl
                  ? {
                      backgroundImage: `linear-gradient(to top, rgba(20,16,14,0.75), rgba(20,16,14,0.05)), url(${category.imageUrl})`,
                    }
                  : { backgroundColor: getAvatarColor(category.slug) }
              }
              className={cn(
                "relative size-28 shrink-0 items-end justify-start rounded-2xl bg-cover bg-center p-3 text-left font-normal transition-transform hover:-translate-y-0.5 hover:bg-transparent sm:size-32",
                category.slug === activeSlug &&
                  "ring-2 ring-primary ring-offset-2 ring-offset-background",
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
                {category.name}
              </span>
            </Button>
          ))}
        </div>

        {canScrollPrev && (
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            aria-label="Scroll categories left"
            className="absolute left-0 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        {canScrollNext && (
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            aria-label="Scroll categories right"
            className="absolute right-0 top-1/2 flex size-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </section>
  );
};
