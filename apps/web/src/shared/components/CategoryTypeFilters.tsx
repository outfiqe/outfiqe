"use client";

import { Button, Skeleton } from "@outfiqe/design-system";

import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { cn } from "@/shared/lib/cn";

export const ALL_TYPE_ID = "all";

const TYPE_FILTER_PLACEHOLDER_COUNT = 6;

type CategoryTypeFiltersProps = {
  activeType: string;
  isNavigating: boolean;
  onSelectType: (typeId: string) => void;
};

export const CategoryTypeFilters = ({
  activeType,
  isNavigating,
  onSelectType,
}: CategoryTypeFiltersProps) => {
  const productTypes = useProductTypes();

  const filters = [
    { id: ALL_TYPE_ID, label: "All" },
    ...(productTypes.data ?? []).map((type) => ({ id: type.slug, label: type.label })),
  ];

  return (
    <div className="flex flex-wrap gap-2" aria-busy={isNavigating}>
      {filters.map((filter) => {
        const isActive = filter.id === activeType;

        return (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={() => onSelectType(filter.id)}
            className={cn(
              "h-auto rounded-full border px-3 py-1.5 font-medium sm:px-4 sm:py-2",
              isActive
                ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:bg-transparent hover:text-foreground",
            )}
          >
            {filter.label}
          </Button>
        );
      })}

      {productTypes.isLoading &&
        Array.from({ length: TYPE_FILTER_PLACEHOLDER_COUNT }).map((_, index) => (
          <Skeleton key={index} className="h-[38px] w-20 rounded-full" />
        ))}
    </div>
  );
};
