import { Info } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { cn } from "./cn";
import { Tooltip } from "./tooltip";

const DELTA_TONE_CLASS = {
  positive: "text-success",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

export type StatCardDelta = {
  readonly value: string;
  readonly tone?: keyof typeof DELTA_TONE_CLASS;
  readonly label?: string;
};

type StatCardProps = {
  readonly label: string;
  readonly value: ReactNode;
  readonly icon?: ComponentType<{ className?: string }>;
  readonly delta?: StatCardDelta;
  readonly hint?: ReactNode;
  readonly className?: string;
};

export const StatCard = ({ label, value, icon: Icon, delta, hint, className }: StatCardProps) => {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          {hint && (
            <Tooltip content={hint}>
              <button
                type="button"
                aria-label={`How ${label} is calculated`}
                className="inline-flex cursor-help text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Info className="size-3.5" aria-hidden />
              </button>
            </Tooltip>
          )}
        </div>
        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
      {delta && (
        <p className={cn("mt-1 text-xs font-medium", DELTA_TONE_CLASS[delta.tone ?? "neutral"])}>
          {delta.value}
          {delta.label && <span className="ml-1 text-muted-foreground">{delta.label}</span>}
        </p>
      )}
    </div>
  );
};
