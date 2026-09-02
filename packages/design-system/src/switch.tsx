import * as React from "react";

import { cn } from "./cn";

export type SwitchProps = Omit<React.ComponentPropsWithoutRef<"input">, "type" | "role" | "size">;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <span className={cn("relative inline-flex h-6 w-11 shrink-0 items-center", className)}>
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className="peer absolute inset-0 z-10 m-0 cursor-pointer appearance-none rounded-full outline-none disabled:cursor-not-allowed"
          {...props}
        />
        <span
          aria-hidden
          className={cn(
            "h-6 w-11 rounded-full border border-border bg-border transition-colors",
            "peer-checked:border-foreground peer-checked:bg-foreground",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
            "peer-disabled:opacity-50",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
            "peer-checked:translate-x-5",
            "peer-disabled:opacity-50",
          )}
        />
      </span>
    );
  },
);
Switch.displayName = "Switch";
