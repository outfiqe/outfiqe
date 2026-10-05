import * as React from "react";

import { cn } from "./cn";

export interface FilterChipProps extends Omit<
  React.ComponentPropsWithoutRef<"button">,
  "aria-pressed"
> {
  isSelected: boolean;
}

export const FilterChip = React.forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ isSelected, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:border-foreground/40 hover:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
FilterChip.displayName = "FilterChip";
