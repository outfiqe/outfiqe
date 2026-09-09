import { StatCard } from "@outfiqe/design-system";
import type { PaymentMethod } from "@outfiqe/types";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { financialRollupApi } from "./api";
import { money, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_ORDER, percent } from "./constants";
import { LedgerTable } from "./LedgerTable";
import type { PaymentMethodBreakdown, RollupRange } from "./schemas";

const RANGE_TABS: RollupRange[] = ["cycle", "30d", "all"];
const RANGE_LABEL: Record<RollupRange, string> = {
  cycle: "This cycle",
  "30d": "Last 30 days",
  all: "All time",
};

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2 text-sm last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-foreground">{value}</span>
  </div>
);

const PaymentMethodRow = ({
  method,
  breakdown,
  shareOfGmv,
}: {
  method: PaymentMethod;
  breakdown: PaymentMethodBreakdown;
  shareOfGmv: number;
}) => (
  <div className="border-b border-border/60 py-3 last:border-0">
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-foreground">{PAYMENT_METHOD_LABEL[method]}</span>
      <span className="text-muted-foreground">
        {breakdown.orderCount} order{breakdown.orderCount === 1 ? "" : "s"}
      </span>
    </div>
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: percent(shareOfGmv) }}
        aria-hidden
      />
    </div>
    <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
      <span>
        {money(breakdown.gmv)} · {percent(shareOfGmv)} of GMV
      </span>
      <span>{percent(breakdown.realizedTakeRate)} realized take rate</span>
    </div>
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
        <StatCard
          label="Attributed order share"
          value={percent(rollup.attribution.attributedShare)}
          hint={`${rollup.attribution.attributedItems} of ${rollup.attribution.totalItems} order item${
            rollup.attribution.totalItems === 1 ? "" : "s"
          } in this range came through a creator's tag or link.`}
        />
      )}

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
              <StatRow
                label="Owed to creators (outstanding)"
                value={money(rollup.ledger.owedToCreators)}
              />
              <StatRow
                label="Owed to brands (outstanding)"
                value={money(rollup.ledger.owedToBrands)}
              />
              {Object.entries(rollup.ledger.creatorCommissionsByStatus).map(([status, amount]) => (
                <StatRow key={status} label={`Creators — ${status}`} value={money(amount)} />
              ))}
              {Object.entries(rollup.ledger.brandPayoutsByStatus).map(([status, amount]) => (
                <StatRow key={status} label={`Brands — ${status}`} value={money(amount)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {rollup && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
            GMV by payment method
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Real margin depends heavily on the COD/wallet mix — eSewa and Khalti absorb a gateway
            fee that COD doesn&apos;t.
          </p>
          <div className="mt-3">
            {Object.keys(rollup.byPaymentMethod).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No orders in this range yet.
              </p>
            ) : (
              (() => {
                const totalGmv = Object.values(rollup.byPaymentMethod).reduce(
                  (sum, breakdown) => sum + breakdown.gmv,
                  0,
                );
                return PAYMENT_METHOD_ORDER.map((method) => {
                  const breakdown = rollup.byPaymentMethod[method];
                  if (!breakdown) return null;
                  return (
                    <PaymentMethodRow
                      key={method}
                      method={method}
                      breakdown={breakdown}
                      shareOfGmv={totalGmv > 0 ? breakdown.gmv / totalGmv : 0}
                    />
                  );
                });
              })()
            )}
          </div>
        </div>
      )}

      <LedgerTable />
    </div>
  );
};
