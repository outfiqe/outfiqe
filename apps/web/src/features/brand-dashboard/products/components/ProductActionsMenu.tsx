"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@outfiqe/design-system";
import { Boxes, MoreVertical, Pencil, Ruler, Tag, Trash2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/shared/lib/cn";

type ProductActionsMenuProps = {
  onEdit: () => void;
  onManageStock: () => void;
  onManageDiscount: () => void;
  onEditSizeChart?: () => void;
  onDelete: () => void;
  className?: string;
};

export const ProductActionsMenu = ({
  onEdit,
  onManageStock,
  onManageDiscount,
  onEditSizeChart,
  onDelete,
  className,
}: ProductActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("z-10", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label="Product options"
            aria-haspopup="menu"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/70"
          >
            <MoreVertical className="size-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent role="menu" sideOffset={6} className="w-40 overflow-hidden rounded-xl py-1">
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            <Pencil className="size-3.5" />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onManageStock();
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            <Boxes className="size-3.5" />
            Manage stock
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onManageDiscount();
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            <Tag className="size-3.5" />
            Sale price
          </button>
          {onEditSizeChart && (
            <button
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onEditSizeChart();
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <Ruler className="size-3.5" />
              Size chart
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </PopoverContent>
      </Popover>
    </div>
  );
};
