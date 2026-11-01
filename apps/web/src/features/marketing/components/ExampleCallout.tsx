import type { ReactNode } from "react";

export const ExampleCallout = ({ title, children }: { title: string; children: ReactNode }) => (
  <aside className="max-w-2xl rounded-xl border border-border bg-muted/50 p-5">
    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Example</p>
    <h3 className="mt-1 font-display text-lg font-bold text-foreground">{title}</h3>
    <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
      {children}
    </div>
  </aside>
);
