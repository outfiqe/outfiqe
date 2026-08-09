"use client";

import { cn } from "@/shared/lib/cn";
import type { ProductSize } from "../api/productDetailSchemas";

interface SizeSelectorProps {
  sizes: ProductSize[];
  selected: string | null;
  onSelect: (label: string) => void;
}

// Sold-out sizes render disabled and crossed out, never hidden — the spec is explicit
// that hiding them is wrong (the buyer should see what exists, just not be able to pick it).
export function SizeSelector({ sizes, selected, onSelect }: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-xs text-muted-foreground">Size</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.label}
            type="button"
            disabled={!size.inStock}
            aria-pressed={selected === size.label}
            onClick={() => onSelect(size.label)}
            className={cn(
              "rounded-lg border px-4 py-2 text-[13.5px] transition-colors",
              !size.inStock &&
                "cursor-not-allowed border-border text-muted-foreground/50 line-through",
              size.inStock &&
                selected === size.label &&
                "border-2 border-foreground px-[15px] py-[7px] font-semibold text-foreground",
              size.inStock &&
                selected !== size.label &&
                "border-border text-muted-foreground hover:border-foreground hover:text-foreground",
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}
