import type { ReactNode } from "react";

const NO_ROWS = 0;

type RankedRow = { rowKey: string; label: ReactNode; value: number };

type RankedListProps = {
  heading: string;
  rows: RankedRow[];
  emptyMessage: string;
};

export const RankedList = ({ heading, rows, emptyMessage }: RankedListProps) => (
  <div>
    <h3 className="mb-2 text-sm font-semibold text-foreground">{heading}</h3>
    {rows.length === NO_ROWS ? (
      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
    ) : (
      <ol className="divide-y divide-border text-sm">
        {rows.map(({ rowKey, label, value }) => (
          <li key={rowKey} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0 truncate text-foreground">{label}</span>
            <span className="tabular-nums text-muted-foreground">{value.toLocaleString()}</span>
          </li>
        ))}
      </ol>
    )}
  </div>
);
