import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-medium",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        outline: "border border-border bg-transparent text-foreground",
      },
      tone: {
        neutral: "bg-muted text-foreground",
        positive: "bg-primary/10 text-primary-strong",
        success: "bg-success/10 text-success",
        negative: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.ComponentPropsWithoutRef<"span">, VariantProps<typeof badgeVariants> {
  dotClassName?: string;
  showDot?: boolean;
}

export const Badge = ({
  className,
  variant,
  tone,
  dotClassName,
  showDot = true,
  children,
  ...props
}: BadgeProps) => {
  return (
    <span className={cn(badgeVariants({ variant, tone, className }))} {...props}>
      {showDot && (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full bg-primary", dotClassName)}
        />
      )}
      {children}
    </span>
  );
};

export { badgeVariants };
