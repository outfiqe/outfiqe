"use client";

import { cn } from "@/shared/lib/cn";

type ThriftOnlyToggleProps = {
  active: boolean;
  onToggle: () => void;
};

export const ThriftOnlyToggle = ({ active, onToggle }: ThriftOnlyToggleProps) => (
  <button
    type="button"
    onClick={onToggle}
    aria-pressed={active}
    className={cn(
      "h-auto rounded-full border px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 sm:py-2",
      active
        ? "border-thrift bg-thrift text-thrift-foreground"
        : "border-border text-muted-foreground hover:border-thrift hover:text-thrift-strong",
    )}
  >
    Thrift only
  </button>
);
