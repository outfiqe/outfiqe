import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

const formBannerVariants = cva("mb-4 rounded-lg border px-3.5 py-3 text-sm", {
  variants: {
    tone: {
      negative: "border-destructive/25 bg-destructive/5 text-destructive",
      positive: "border-primary/25 bg-primary/5 text-primary-strong",
      success: "border-success/25 bg-success/10 text-success",
      neutral: "border-border bg-muted text-foreground",
    },
  },
  defaultVariants: { tone: "negative" },
});

export interface FormBannerProps extends VariantProps<typeof formBannerVariants> {
  children: ReactNode;
  className?: string;
  onDismiss?: () => void;
}

export const FormBanner = ({ children, className, tone, onDismiss }: FormBannerProps) => {
  return (
    <div role="alert" aria-live="polite" className={cn(formBannerVariants({ tone }), className)}>
      <div className="flex items-start gap-3">
        <div className="flex-1">{children}</div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 cursor-pointer rounded-full p-0.5 text-current/70 transition-colors hover:text-current"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
};
