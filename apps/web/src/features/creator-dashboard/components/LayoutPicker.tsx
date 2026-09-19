"use client";

import { POST_LAYOUT_LABEL, POST_LAYOUT_VALUES, type PostLayout } from "@outfiqe/utils";

import { cn } from "@/shared/lib/cn";

type LayoutPickerProps = {
  selected: PostLayout;
  onSelect: (layout: PostLayout) => void;
  disabled?: boolean;
};

export const LayoutPicker = ({ selected, onSelect, disabled = false }: LayoutPickerProps) => (
  <div>
    <p className="mb-2 text-xs text-muted-foreground">
      Layout{disabled && " — remove your photos to change this"}
    </p>
    <div className="flex flex-wrap gap-2">
      {POST_LAYOUT_VALUES.map((layout) => (
        <button
          key={layout}
          type="button"
          disabled={disabled}
          aria-pressed={selected === layout}
          onClick={() => onSelect(layout)}
          className={cn(
            "rounded-lg border px-4 py-2 text-[13.5px] transition-colors",
            disabled && "cursor-not-allowed opacity-50",
            selected === layout &&
              "border-2 border-foreground px-[15px] py-[7px] font-semibold text-foreground",
            selected !== layout && "border-border text-muted-foreground",
            !disabled && selected !== layout && "hover:border-foreground hover:text-foreground",
          )}
        >
          {POST_LAYOUT_LABEL[layout]}
        </button>
      ))}
    </div>
  </div>
);
