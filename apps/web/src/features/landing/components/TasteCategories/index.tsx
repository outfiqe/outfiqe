"use client";

import { Button, Skeleton } from "@outfiqe/design-system";
import { useRouter, useSearchParams } from "next/navigation";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { getAvatarColor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

export const TasteCategories = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categories = useCategories();
  const activeSlug = searchParams.get("category") ?? categories.data?.[0]?.slug;

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

      <div
        className={cn(
          "-mx-2 mt-5 flex gap-3 p-2",
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
    </section>
  );
};
