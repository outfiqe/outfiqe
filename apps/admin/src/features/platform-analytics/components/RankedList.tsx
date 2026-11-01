import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

const NO_ROWS = 0;
const ROW_LINK_CLASS_NAME =
  "group inline-flex min-w-0 max-w-full items-center gap-1 rounded text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type RankedRow = {
  rowKey: string;
  label: ReactNode;
  value: number | string;
  href?: string;
  to?: string;
  search?: Record<string, string>;
};

type RankedListProps = {
  heading: string;
  rows: RankedRow[];
  emptyMessage: string;
};

const RowLabel = ({ label, href, to, search }: RankedRow) => {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={ROW_LINK_CLASS_NAME}>
        <span className="truncate">{label}</span>
        <ExternalLink
          className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </a>
    );
  }
  if (to) {
    return (
      <Link to={to} search={search} className={ROW_LINK_CLASS_NAME}>
        <span className="truncate">{label}</span>
      </Link>
    );
  }
  return <span className="block truncate text-foreground">{label}</span>;
};

export const RankedList = ({ heading, rows, emptyMessage }: RankedListProps) => (
  <div className="min-w-0">
    <h3 className="mb-2 text-sm font-semibold text-foreground">{heading}</h3>
    {rows.length === NO_ROWS ? (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    ) : (
      <ol className="divide-y divide-border text-sm">
        {rows.map((row) => (
          <li key={row.rowKey} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0">
              <RowLabel {...row} />
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);
