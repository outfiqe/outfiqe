import type { ComponentType, ReactNode } from "react";

import { cn } from "./cn";

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
  readonly className?: string;
};

export const StatCard = ({ label, value, icon: Icon, delta, className }: StatCardProps) => {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
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
