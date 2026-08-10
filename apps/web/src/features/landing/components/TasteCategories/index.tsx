"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/design-system/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { TASTE_CATEGORIES } from "./tasteCategories.constants";

export const TasteCategories = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get("category") ?? TASTE_CATEGORIES[0]!.slug;

  const selectCategory = (slug: string) => {
    router.replace(`/?category=${slug}`, { scroll: false });
  };

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

      <div className="-mx-2 mt-5 flex gap-3 overflow-x-auto p-2">
        {TASTE_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant="ghost"
            onClick={() => selectCategory(category.slug)}
            style={
              category.image
                ? {
                    backgroundImage: `linear-gradient(to top, rgba(20,16,14,0.75), rgba(20,16,14,0.05)), url(${category.image})`,
                  }
                : { backgroundColor: category.color }
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
    </section>
  );
};
