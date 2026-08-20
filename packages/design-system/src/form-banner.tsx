import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { cn } from "./cn";

const formBannerVariants = cva("mb-4 rounded-lg border px-3.5 py-3 text-sm", {
  variants: {
    tone: {
      negative: "border-destructive/25 bg-destructive/5 text-destructive",
      positive: "border-primary/25 bg-primary/5 text-primary-strong",
      neutral: "border-border bg-muted text-foreground",
    },
  },
  defaultVariants: { tone: "negative" },
});

export interface FormBannerProps extends VariantProps<typeof formBannerVariants> {
  children: ReactNode;
  className?: string;
}

export const FormBanner = ({ children, className, tone }: FormBannerProps) => {
  return (
    <div role="alert" aria-live="polite" className={cn(formBannerVariants({ tone }), className)}>
      {children}
    </div>
  );
};
