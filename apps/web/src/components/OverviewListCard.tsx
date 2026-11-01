import Link from "next/link";
import type { ReactNode } from "react";

import { AppImage } from "@/shared/components/AppImage";

export const OverviewListCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) => (
  <section className="min-w-0 rounded-xl border border-border bg-card p-5">
    <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    <div className="mt-3">{children}</div>
  </section>
);

export const OverviewListRow = ({
  href,
  imageUrl,
  title,
  detail,
  value,
}: {
  href: string;
  imageUrl?: string | null;
  title: string;
  detail: string;
  value: string;
}) => (
  <Link
    href={href}
    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/60"
  >
    {imageUrl !== undefined && (
      <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
        {imageUrl && <AppImage src={imageUrl} alt="" fill sizes="40px" />}
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-medium text-foreground">{title}</span>
      <span className="block truncate text-xs text-muted-foreground">{detail}</span>
    </span>
    <span className="shrink-0 text-sm font-semibold text-foreground">{value}</span>
  </Link>
);

export const OverviewEmptyLine = ({ children }: { children: ReactNode }) => (
  <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">{children}</p>
);
