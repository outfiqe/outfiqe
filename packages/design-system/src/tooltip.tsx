"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "./cn";

const DEFAULT_OPEN_DELAY_MS = 200;

export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>;

export const TooltipContent = ({ className, sideOffset = 6, ...props }: TooltipContentProps) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-xs rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg",
        className,
      )}
      {...props}
    >
      {props.children}
      <TooltipPrimitive.Arrow className="fill-card" />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
);

type TooltipProps = {
  readonly content: ReactNode;
  readonly children: ReactNode;
  readonly side?: TooltipContentProps["side"];
  readonly align?: TooltipContentProps["align"];
  readonly openDelayMs?: number;
};

export const Tooltip = ({
  content,
  children,
  side = "top",
  align = "center",
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
}: TooltipProps) => (
  <TooltipProvider delayDuration={openDelayMs}>
    <TooltipRoot>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  </TooltipProvider>
);
