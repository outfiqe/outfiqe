import { CLICKABLE_STAT_CARD_CLASS_NAME, FormBanner, StatCard } from "@outfiqe/design-system";

import { StatCardFooterLink } from "@/components/MetricParts";

import type { FinancialRollup, LedgerFocus, RollupRange } from "../api/financialRollupSchemas";
import { LEDGER_PATH, money, ROLLUP_RANGE_LABEL } from "../constants/financialRollup.constants";
import { buildRollupInsight } from "../utils/rollupInsight.utils";

type RollupCardsProps = { rollup: FinancialRollup; range: RollupRange };

export const RollupInsightBanner = ({ rollup }: { rollup: FinancialRollup }) => {
  const { tone, headline, detail } = buildRollupInsight(rollup);

  return (
    <FormBanner tone={tone} className="mb-6">
      <span className="font-semibold">{headline}.</span> {detail}
    </FormBanner>
  );
};

const MoneyCard = ({
  label,
  amount,
  hint,
  range,
  focus,
}: {
  label: string;
  amount: number;
  hint: string;
  range: RollupRange;
  focus?: LedgerFocus;
}) => (
  <StatCard
    label={label}
    className={CLICKABLE_STAT_CARD_CLASS_NAME}
    value={money(amount)}
    hint={hint}
    footer={
      <StatCardFooterLink
        to={LEDGER_PATH}
        search={{ range, focus }}
        period={ROLLUP_RANGE_LABEL[range]}
      />
    }
  />
);

export const RollupMoneyCards = ({ rollup, range }: RollupCardsProps) => {
  const { gateway, ledger } = rollup;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <MoneyCard
        label="Money collected"
        amount={gateway.grossCollected}
        hint="Order payments that succeeded, by eSewa, Khalti or cash on delivery."
        range={range}
      />
      <MoneyCard
        label="Refunded"
        amount={gateway.refunded}
        hint="Money given back to shoppers."
        range={range}
        focus="REFUNDED"
      />
      <MoneyCard
        label="Money held"
        amount={gateway.netHeld}
        hint="Money collected, minus refunds."
        range={range}
      />
      <MoneyCard
        label="Owed to brands"
        amount={ledger.owedToBrands}
        hint="What brands have earned and not been paid yet."
        range={range}
        focus="OWED_TO_BRANDS"
      />
      <MoneyCard
        label="Owed to muses"
        amount={ledger.owedToCreators}
        hint="Commission muses have earned and not been paid yet."
        range={range}
        focus="OWED_TO_MUSES"
      />
      <MoneyCard
        label="Platform earnings"
        amount={ledger.netPlatformRevenue}
        hint="Platform fees on orders where the brand has been paid, minus coupons the platform paid for."
        range={range}
        focus="PLATFORM_EARNED"
      />
    </div>
  );
};
