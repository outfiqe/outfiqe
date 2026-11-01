import { ProgressBar } from "@outfiqe/design-system";
import type { PaymentMethod } from "@outfiqe/types";

import {
  MetricEmptyState,
  MetricLinkRow,
  MetricRow,
  MetricSection,
} from "@/components/MetricParts";

import type {
  FinancialRollup,
  PaymentMethodBreakdown,
  RollupRange,
} from "../api/financialRollupSchemas";
import {
  LEDGER_PATH,
  money,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_ORDER,
  percent,
  ROLLUP_RANGE_LABEL,
} from "../constants/financialRollup.constants";

const NO_ORDER_VALUE = 0;
const SINGLE_ORDER = 1;
const FULL_SHARE_SCALE = 100;

type RollupSectionProps = { rollup: FinancialRollup; range: RollupRange };

const PaymentMethodRow = ({
  method,
  breakdown,
  shareOfOrderValue,
  range,
}: {
  method: PaymentMethod;
  breakdown: PaymentMethodBreakdown;
  shareOfOrderValue: number;
  range: RollupRange;
}) => {
  const { gmv, orderCount, realizedTakeRate } = breakdown;
  const orderLabel = `${orderCount} order${orderCount === SINGLE_ORDER ? "" : "s"}`;

  return (
    <div className="[&>*:first-child]:border-0">
      <MetricLinkRow
        to={LEDGER_PATH}
        search={{ range, method }}
        label={PAYMENT_METHOD_LABEL[method]}
        detail={`${orderLabel} · ${percent(shareOfOrderValue)} of order value · platform keeps ${percent(realizedTakeRate)}`}
        value={money(gmv)}
      />
      <ProgressBar
        value={shareOfOrderValue * FULL_SHARE_SCALE}
        max={FULL_SHARE_SCALE}
        label={`${PAYMENT_METHOD_LABEL[method]}: ${percent(shareOfOrderValue)} of order value`}
        className="mb-2"
      />
    </div>
  );
};

const PaymentMethodSection = ({ rollup, range }: RollupSectionProps) => {
  const { byPaymentMethod } = rollup;
  const totalOrderValue = Object.values(byPaymentMethod).reduce(
    (sum, { gmv }) => sum + gmv,
    NO_ORDER_VALUE,
  );

  return (
    <MetricSection
      title="How shoppers paid"
      description="Cash on delivery has no gateway fee. eSewa and Khalti take one, so the mix changes what the platform keeps."
    >
      {Object.keys(byPaymentMethod).length === 0 ? (
        <MetricEmptyState>No orders in this period yet.</MetricEmptyState>
      ) : (
        PAYMENT_METHOD_ORDER.map((method) => {
          const breakdown = byPaymentMethod[method];
          if (!breakdown) return null;
          return (
            <PaymentMethodRow
              key={method}
              method={method}
              breakdown={breakdown}
              shareOfOrderValue={
                totalOrderValue > NO_ORDER_VALUE ? breakdown.gmv / totalOrderValue : NO_ORDER_VALUE
              }
              range={range}
            />
          );
        })
      )}
    </MetricSection>
  );
};

export const RollupEarningsSections = ({ rollup, range }: RollupSectionProps) => {
  const { ledger, attribution } = rollup;
  const { platformRevenueRealized, couponSpend, netPlatformRevenue } = ledger;
  const { attributedItems, totalItems, attributedShare } = attribution;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricSection
          title="Platform earnings"
          description="Fees count once the brand has been paid for that order."
        >
          <MetricLinkRow
            to={LEDGER_PATH}
            search={{ range, focus: "PLATFORM_EARNED" }}
            label="Fees earned"
            value={money(platformRevenueRealized)}
          />
          <MetricRow label="Coupons the platform paid for" value={`− ${money(couponSpend)}`} />
          <MetricRow label="What's left" value={money(netPlatformRevenue)} />
        </MetricSection>

        <MetricSection
          title="Sold through muses"
          description="Items a shopper bought through a muse's look or link."
        >
          <MetricLinkRow
            to={LEDGER_PATH}
            search={{ range, focus: "MUSE_CREDITED" }}
            label={`${attributedItems} of ${totalItems} items ${ROLLUP_RANGE_LABEL[range].toLowerCase()}`}
            value={percent(attributedShare)}
          />
        </MetricSection>
      </div>

      <PaymentMethodSection rollup={rollup} range={range} />
    </>
  );
};
