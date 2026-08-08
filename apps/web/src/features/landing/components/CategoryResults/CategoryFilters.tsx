"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/design-system/components/ui/button";
import { cn } from "@/shared/lib/cn";
import { PRODUCT_TYPE_FILTERS } from "./categoryResults.constants";

interface CategoryFiltersProps {
  categorySlug: string;
  activeType: string;
}

export function CategoryFilters({ categorySlug, activeType }: CategoryFiltersProps) {
  const router = useRouter();

  const selectType = (typeId: string) => {
    const url =
      typeId === "all" ? `/?category=${categorySlug}` : `/?category=${categorySlug}&type=${typeId}`;
    router.replace(url, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PRODUCT_TYPE_FILTERS.map((filter) => {
        const isActive = filter.id === activeType;

        return (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={() => selectType(filter.id)}
            className={cn(
              "h-auto rounded-full border px-4 py-2 font-medium",
              isActive
                ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:bg-transparent hover:text-foreground",
            )}
          >
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
}
