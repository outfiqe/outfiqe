import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { type Breadcrumb, breadcrumbSchema, JsonLd } from "./jsonLd";

interface BreadcrumbsProps {
  crumbs: Breadcrumb[];
  className?: string;
}

export const Breadcrumbs = ({ crumbs, className }: BreadcrumbsProps) => {
  if (crumbs.length === 0) return null;

  const lastIndex = crumbs.length - 1;

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className={`text-xs text-muted-foreground ${className ?? ""}`.trim()}
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {crumbs.map((crumb, index) => {
            const isCurrent = index === lastIndex;
            return (
              <li key={crumb.path} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden />
                ) : null}
                {isCurrent ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.path} className="transition-colors hover:text-foreground">
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd id="breadcrumb-jsonld" data={breadcrumbSchema(crumbs)} />
    </>
  );
};
