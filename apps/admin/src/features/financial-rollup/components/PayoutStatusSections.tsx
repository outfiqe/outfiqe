import { MetricLinkRow, MetricRow, MetricSection } from "@/components/MetricParts";

import type { FinancialRollup, RollupRange } from "../api/financialRollupSchemas";
import {
  BRAND_PAYOUT_STATUS_EXPLANATION,
  BRAND_PAYOUT_STATUS_LABEL,
  BRAND_PAYOUT_STATUS_ORDER,
  COMMISSION_STATUS_EXPLANATION,
  COMMISSION_STATUS_LABEL,
  COMMISSION_STATUS_ORDER,
  LEDGER_PATH,
  money,
} from "../constants/financialRollup.constants";

const NO_MONEY = 0;

const StatusRow = ({
  label,
  detail,
  amount,
  search,
}: {
  label: string;
  detail: string;
  amount: number;
  search: Record<string, string>;
}) =>
  amount === NO_MONEY ? (
    <MetricRow label={label} detail={detail} value={money(amount)} />
  ) : (
    <MetricLinkRow
      to={LEDGER_PATH}
      search={search}
      label={label}
      detail={detail}
      value={money(amount)}
    />
  );

export const PayoutStatusSections = ({
  rollup,
  range,
}: {
  rollup: FinancialRollup;
  range: RollupRange;
}) => {
  const { brandPayoutsByStatus, creatorCommissionsByStatus } = rollup.ledger;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <MetricSection title="Brand payouts" description="Where each brand's earnings are right now.">
        {BRAND_PAYOUT_STATUS_ORDER.map((status) => (
          <StatusRow
            key={status}
            label={BRAND_PAYOUT_STATUS_LABEL[status]}
            detail={BRAND_PAYOUT_STATUS_EXPLANATION[status]}
            amount={brandPayoutsByStatus[status] ?? NO_MONEY}
            search={{ range, payout: status }}
          />
        ))}
      </MetricSection>

      <MetricSection
        title="Muse commissions"
        description="Where each muse's earnings are right now."
      >
        {COMMISSION_STATUS_ORDER.map((status) => (
          <StatusRow
            key={status}
            label={COMMISSION_STATUS_LABEL[status]}
            detail={COMMISSION_STATUS_EXPLANATION[status]}
            amount={creatorCommissionsByStatus[status] ?? NO_MONEY}
            search={{ range, commission: status }}
          />
        ))}
      </MetricSection>
    </div>
  );
};
