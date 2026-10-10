import type { ReactNode } from "react";

type StudioSectionProps = {
  title: string;
  hint?: string;
  children: ReactNode;
};

export const StudioSection = ({ title, hint, children }: StudioSectionProps) => (
  <div className="rounded-xl border border-border bg-muted/30 p-4">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    <div className="mt-3">{children}</div>
  </div>
);
