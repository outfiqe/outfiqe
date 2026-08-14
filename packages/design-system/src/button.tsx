"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold " +
    "transition-colors disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-[#ff6a1f]",
        outline:
          "border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary-strong underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-12 px-7",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
