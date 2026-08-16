import { Skeleton } from "@outfiqe/design-system";

import type { EarningsSummary } from "../api/commissionSchemas";

type EarningsSummaryTilesProps = {
  summary: EarningsSummary | undefined;
  isLoading: boolean;
};

const TILES: { key: keyof EarningsSummary; label: string }[] = [
  { key: "totalEarnings", label: "Total earnings" },
  { key: "pending", label: "Pending" },
  { key: "available", label: "Available" },
  { key: "paid", label: "Paid" },
];

export const EarningsSummaryTiles = ({ summary, isLoading }: EarningsSummaryTilesProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map(({ key, label }) => (
        <div key={key} className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-2 h-6 w-16" />
          ) : (
            <p className="mt-1 font-display text-xl font-bold text-foreground">
              Rs. {(summary?.[key] ?? 0).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};
