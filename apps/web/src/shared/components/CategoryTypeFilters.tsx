"use client";

import { Button } from "@outfiqe/design-system";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useProductTypes } from "@/features/products/hooks/useProductTypes";
import { cn } from "@/shared/lib/cn";

export const ALL_TYPE_ID = "all";

type CategoryTypeFiltersProps = {
  basePath: string;
  categorySlug: string;
  activeType: string;
};

type PendingType = { typeId: string; fromActiveType: string };

export const CategoryTypeFilters = ({
  basePath,
  categorySlug,
  activeType,
}: CategoryTypeFiltersProps) => {
  const router = useRouter();
  const productTypes = useProductTypes();
  const [pendingType, setPendingType] = useState<PendingType | null>(null);

  const filters = [
    { id: ALL_TYPE_ID, label: "All" },
    ...(productTypes.data ?? []).map((type) => ({ id: type.slug, label: type.label })),
  ];

  const isNavigating = pendingType?.fromActiveType === activeType;

  const selectType = (typeId: string) => {
    setPendingType({ typeId, fromActiveType: activeType });
    const params = new URLSearchParams({ category: categorySlug });
    if (typeId !== ALL_TYPE_ID) params.set("type", typeId);
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  };

  const effectiveActiveType = isNavigating && pendingType ? pendingType.typeId : activeType;

  return (
    <div className="flex flex-wrap gap-2" aria-busy={isNavigating}>
      {filters.map((filter) => {
        const isActive = filter.id === effectiveActiveType;

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
};
