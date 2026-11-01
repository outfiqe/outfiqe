import type { ReactNode } from "react";

export const CrmPageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="min-w-0 flex-1 basis-80">
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
