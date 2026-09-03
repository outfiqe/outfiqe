"use client";

import type { ReactNode } from "react";

import { cn } from "./cn";
import { FormBanner } from "./form-banner";
import { Skeleton } from "./skeleton";

const DEFAULT_EMPTY_MESSAGE = "Not enough data yet.";
const DEFAULT_CHART_MIN_HEIGHT = 260;

type ChartCardProps = {
  readonly title: string;
  readonly description?: string;
  readonly ariaLabel?: string;
  readonly isLoading?: boolean;
  readonly isEmpty?: boolean;
  readonly emptyMessage?: string;
  readonly error?: string | null;
  readonly action?: ReactNode;
  readonly dataTable?: ReactNode;
  readonly minHeight?: number;
  readonly className?: string;
  readonly children: ReactNode;
};

export const ChartCard = ({
  title,
  description,
  ariaLabel,
  isLoading = false,
  isEmpty = false,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  error = null,
  action,
  dataTable,
  minHeight = DEFAULT_CHART_MIN_HEIGHT,
  className,
  children,
}: ChartCardProps) => {
  return (
    <figure
      aria-label={ariaLabel ?? title}
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}
    >
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </figcaption>

      {error ? (
        <FormBanner>{error}</FormBanner>
      ) : isLoading ? (
        <Skeleton className="w-full rounded-xl" style={{ height: minHeight }} />
      ) : isEmpty ? (
        <p
          className="flex items-center justify-center text-center text-sm text-muted-foreground"
          style={{ minHeight }}
        >
          {emptyMessage}
        </p>
      ) : (
        <>
          <div aria-hidden style={{ minHeight }}>
            {children}
          </div>
          {dataTable && <div className="sr-only">{dataTable}</div>}
        </>
      )}
    </figure>
  );
};
