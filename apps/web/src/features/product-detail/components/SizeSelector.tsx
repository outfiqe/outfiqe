"use client";

import { cn } from "@/shared/lib/cn";

import type { ProductSize } from "../api/productDetailSchemas";

type SizeSelectorProps = {
  sizes: ProductSize[];
  selected: string | null;
  onSelect: (sizeId: string) => void;
};

export const SizeSelector = ({ sizes, selected, onSelect }: SizeSelectorProps) => {
  if (sizes.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-xs text-muted-foreground">Size</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            disabled={!size.inStock}
            aria-pressed={selected === size.id}
            onClick={() => onSelect(size.id)}
            className={cn(
              "rounded-lg border px-4 py-2 text-[13.5px] transition-colors",
              !size.inStock &&
                "cursor-not-allowed border-border text-muted-foreground/50 line-through",
              size.inStock &&
                selected === size.id &&
                "border-2 border-foreground px-[15px] py-[7px] font-semibold text-foreground",
              size.inStock &&
                selected !== size.id &&
                "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
};
