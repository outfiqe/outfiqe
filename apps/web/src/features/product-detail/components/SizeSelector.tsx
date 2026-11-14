"use client";

import { type Ref, useId } from "react";

import { cn } from "@/shared/lib/cn";

import type { ProductSize } from "../api/productDetailSchemas";

type SizeSelectorProps = {
  ref?: Ref<HTMLDivElement>;
  sizes: ProductSize[];
  selected: string | null;
  onSelect: (sizeId: string) => void;
  isDisabled?: boolean;
  isMissingChoice?: boolean;
};

export const SizeSelector = ({
  ref,
  sizes,
  selected,
  onSelect,
  isDisabled = false,
  isMissingChoice = false,
}: SizeSelectorProps) => {
  const sizeLabelId = useId();
  if (sizes.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <p id={sizeLabelId} className="mb-2 text-xs text-muted-foreground">
        Size
      </p>
      <div ref={ref} role="group" aria-labelledby={sizeLabelId} className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            disabled={isDisabled || !size.inStock}
            aria-pressed={selected === size.id}
            onClick={() => onSelect(size.id)}
            className={cn(
              "rounded-lg border px-4 py-2 text-[13.5px] transition-colors",
              !size.inStock &&
                "cursor-not-allowed border-border text-muted-foreground/50 line-through",
              size.inStock &&
                selected === size.id &&
                "border-2 border-foreground px-[15px] py-[7px] font-semibold text-foreground",
              size.inStock && selected !== size.id && "border-border text-muted-foreground",
              size.inStock && isMissingChoice && "border-destructive",
              size.inStock &&
                selected !== size.id &&
                !isDisabled &&
                "cursor-pointer hover:border-foreground hover:text-foreground",
              size.inStock && isDisabled && "cursor-not-allowed opacity-60",
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
};
