import { formatLakhAmount } from "@/shared/lib/nepalFormatting";

import type { RiderEarningsSummary as RiderEarningsTotals } from "../api/riderEarningsSchemas";

type RiderEarningsSummaryProps = { summary: RiderEarningsTotals };

export const RiderEarningsSummary = ({ summary }: RiderEarningsSummaryProps) => {
  const totals = [
    { label: "Ready to withdraw", amount: summary.availableAmount },
    { label: "On hold for 7 days", amount: summary.pendingAmount },
    { label: "Paid to you", amount: summary.withdrawnAmount },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {totals.map(({ label, amount }) => (
        <div key={label} className="rounded-2xl border border-border bg-card p-3">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 text-lg font-semibold text-foreground">
            Rs. {formatLakhAmount(amount)}
          </dd>
        </div>
      ))}
    </dl>
  );
};
