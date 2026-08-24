import { Skeleton } from "@outfiqe/design-system";

import type { BrandPayoutSummary } from "../api/brandPayoutSchemas";

type WalletSummaryTilesProps = {
  summary: BrandPayoutSummary | undefined;
  isLoading: boolean;
};

const TILES: { key: keyof BrandPayoutSummary; label: string }[] = [
  { key: "totalPayouts", label: "Total sales" },
  { key: "pending", label: "Pending" },
  { key: "available", label: "Available" },
  { key: "withdrawn", label: "Withdrawn" },
];

export const WalletSummaryTiles = ({ summary, isLoading }: WalletSummaryTilesProps) => {
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
