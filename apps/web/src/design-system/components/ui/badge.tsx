import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[11.5px] font-medium text-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "border border-border bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.ComponentPropsWithoutRef<"span">, VariantProps<typeof badgeVariants> {
  dotClassName?: string;
}

export function Badge({ className, variant, dotClassName, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props}>
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full bg-primary", dotClassName)} />
      {children}
    </span>
  );
}
