import { Tooltip } from "@outfiqe/design-system";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

export const JargonHint = ({ term, children }: { term: string; children: ReactNode }) => (
  <Tooltip content={children}>
    <button
      type="button"
      aria-label={`What does ${term} mean?`}
      className="inline-flex cursor-help text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Info className="size-3.5" aria-hidden />
    </button>
  </Tooltip>
);

export const Card = ({ title, children }: { title: ReactNode; children: ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
    <div className="mt-3">{children}</div>
  </div>
);

export const Row = ({ label, value }: { label: ReactNode; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">{children}</p>
);
