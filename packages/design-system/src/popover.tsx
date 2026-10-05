"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";
import { OVERLAY_LAYER } from "./layers";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

type PopoverContentProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>;

export const PopoverContent = ({
  className,
  align = "end",
  sideOffset = 8,
  ...props
}: PopoverContentProps) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "rounded-lg border border-border bg-card shadow-lg outline-none",
        OVERLAY_LAYER.FLOATING,
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
);
