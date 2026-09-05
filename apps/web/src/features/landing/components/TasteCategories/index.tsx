"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTastePreferences } from "@/features/categories/hooks/useTastePreferences";
import { visibleTasteCategories } from "@/features/categories/lib/visibleTasteCategories";
import { getAvatarColor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

import { useCategorySelection } from "../../lib/CategorySelectionContext";
import { CustomizeTasteModal } from "./CustomizeTasteModal";

const SCROLL_STEP_PX = 320;
const SCROLL_END_TOLERANCE_PX = 1;

export const TasteCategories = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categories = useCategories();
  const { storedSlugs, isCustomized, save, reset } = useTastePreferences();
  const { pendingCategorySlug, markCategoryPending } = useCategorySelection();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  const allCategories = categories.data ?? [];
  const visibleCategories = visibleTasteCategories(allCategories, storedSlugs);
  const deepLinkedSlug = searchParams.get("category");
  const deepLinkedCategory =
    deepLinkedSlug && !visibleCategories.some((category) => category.slug === deepLinkedSlug)
      ? allCategories.find((category) => category.slug === deepLinkedSlug)
      : undefined;
  const displayCategories = deepLinkedCategory
    ? [deepLinkedCategory, ...visibleCategories]
    : visibleCategories;

  const resolvedSlug = deepLinkedSlug ?? displayCategories[0]?.slug;
  const isNavigating = pendingCategorySlug !== null;
  const activeSlug = pendingCategorySlug ?? resolvedSlug;

  const canCustomize = allCategories.length > visibleCategories.length || isCustomized;

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
  }, [displayCategories.length, categories.isLoading]);

  const scrollByStep = (direction: 1 | -1) => {
    scrollerRef.current?.scrollBy({ left: direction * SCROLL_STEP_PX, behavior: "smooth" });
  };

  const selectCategory = (slug: string) => {
    markCategoryPending(slug);
    router.replace(`/?category=${slug}`, { scroll: false });
  };

  const hasNoCategories = !categories.isLoading && allCategories.length === 0;

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

      {hasNoCategories && (
        <p className="mt-8 text-sm text-muted-foreground">No categories yet — check back soon.</p>
      )}

      {categories.isLoading && (
        <div className="-mx-2 mt-5 flex gap-3 overflow-hidden p-2">
          {Array.from({ length: 20 }).map((_, index) => (
            <Skeleton key={index} className="size-28 shrink-0 rounded-2xl sm:size-32" />
          ))}
        </div>
      )}

      {!hasNoCategories && !categories.isLoading && (
        <div className="relative mt-5">
          <div
            ref={scrollerRef}
            onScroll={updateScrollability}
            aria-busy={isNavigating}
            className={cn(
              "-mx-2 flex gap-3 overflow-x-auto p-2",
              "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            )}
          >
            {displayCategories.map((category) => (
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

            {canCustomize && (
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="flex size-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground sm:size-32"
              >
                <SlidersHorizontal className="size-5" />
                <span className="text-[11px] font-bold uppercase tracking-wide sm:text-xs">
                  Customize
                </span>
              </button>
            )}
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
      )}

      {isCustomizeOpen && (
        <CustomizeTasteModal
          allCategories={allCategories}
          selectedSlugs={visibleCategories.map((category) => category.slug)}
          onSave={save}
          onReset={reset}
          onClose={() => setIsCustomizeOpen(false)}
        />
      )}
    </section>
  );
};
