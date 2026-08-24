import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { financialRollupApi } from "./api";
import type { RollupRange } from "./schemas";

const RANGE_TABS: RollupRange[] = ["cycle", "30d", "all"];
const RANGE_LABEL: Record<RollupRange, string> = {
  cycle: "This cycle",
  "30d": "Last 30 days",
  all: "All time",
};

const money = (amount: number) => `Rs. ${amount.toLocaleString()}`;

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

export const FinancialRollupPage = () => {
  const [range, setRange] = useState<RollupRange>("cycle");

  const {
    data: rollup,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["financial-rollup", range],
    queryFn: () => financialRollupApi.get(range),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Financial rollup</h1>

      <div className="flex flex-wrap gap-2">
        {RANGE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setRange(tab)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              range === tab
                ? "bg-foreground text-background"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {RANGE_LABEL[tab]}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn&apos;t load the rollup.</p>}

      {rollup && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Gateway
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Money actually collected via payment gateways.
            </p>
            <div className="mt-3">
              <StatRow label="Gross collected" value={money(rollup.gateway.grossCollected)} />
              <StatRow label="Refunded" value={money(rollup.gateway.refunded)} />
              <StatRow label="Net held" value={money(rollup.gateway.netHeld)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Ledger
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              What&apos;s owed to creators and brands per the settlement ledger.
            </p>
            <div className="mt-3">
              <StatRow
                label="Platform revenue realized"
                value={money(rollup.ledger.platformRevenueRealized)}
              />
              {Object.entries(rollup.ledger.owedToCreators).map(([status, amount]) => (
                <StatRow key={status} label={`Creators — ${status}`} value={money(amount)} />
              ))}
              {Object.entries(rollup.ledger.owedToBrands).map(([status, amount]) => (
                <StatRow key={status} label={`Brands — ${status}`} value={money(amount)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
