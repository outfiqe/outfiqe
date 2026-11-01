import { FormBanner } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { MetricLinkRow, MetricRow, MetricSection } from "@/components/MetricParts";

import { financialRollupApi } from "../api/financialRollupApi";
import type { MoneyBreakdown, RollupRange } from "../api/financialRollupSchemas";
import { LEDGER_PATH, money } from "../constants/financialRollup.constants";

const BREAKDOWN_RANGE: RollupRange = "30d";
const FULLY_EXPLAINED = 0;
const TOLERATED_UNEXPLAINED_RATIO = 0.02;

type BreakdownRow = {
  label: string;
  detail: string;
  amount: number;
  ledgerFilter?: Record<string, string>;
};

const toBreakdownRows = ({
  brandsOwed,
  brandsPaid,
  musesOwed,
  musesPaid,
  gatewayFees,
  platformKeeps,
  orderFees,
  cancelledNotRefunded,
  couponSpend,
}: MoneyBreakdown): BreakdownRow[] => [
  {
    label: "Still owed to brands",
    detail: "Earned, not paid out yet.",
    amount: brandsOwed,
    ledgerFilter: { focus: "OWED_TO_BRANDS" },
  },
  {
    label: "Paid to brands",
    detail: "Already sent to brands.",
    amount: brandsPaid,
    ledgerFilter: { payout: "WITHDRAWN" },
  },
  {
    label: "Still owed to muses",
    detail: "Commission earned, not paid out yet.",
    amount: musesOwed,
    ledgerFilter: { focus: "OWED_TO_MUSES" },
  },
  {
    label: "Paid to muses",
    detail: "Commission already sent to muses.",
    amount: musesPaid,
    ledgerFilter: { commission: "PAID" },
  },
  { label: "Gateway fees", detail: "Charged by eSewa and Khalti.", amount: gatewayFees },
  {
    label: "Platform keeps",
    detail: "Platform fees, after gateway fees and muse commissions.",
    amount: platformKeeps,
  },
  {
    label: "Delivery and COD fees",
    detail: "Paid by shoppers on top of items.",
    amount: orderFees,
  },
  {
    label: "Cancelled, not refunded yet",
    detail: "Paid for, then cancelled or returned, and no refund recorded.",
    amount: cancelledNotRefunded,
    ledgerFilter: { payout: "VOIDED" },
  },
  {
    label: "Coupons the platform paid for",
    detail: "Taken off at checkout.",
    amount: -couponSpend,
  },
];

const hasMeaningfulGap = ({ unexplained, held }: MoneyBreakdown): boolean =>
  Math.abs(unexplained) > Math.abs(held) * TOLERATED_UNEXPLAINED_RATIO;

const BreakdownVerdict = ({ moneyBreakdown }: { moneyBreakdown: MoneyBreakdown }) => {
  const { unexplained, held } = moneyBreakdown;

  if (hasMeaningfulGap(moneyBreakdown)) {
    return (
      <FormBanner className="mb-3">
        <span className="font-semibold">{money(unexplained)} can&apos;t be traced.</span> Check the
        ledger for orders with no payout record.
      </FormBanner>
    );
  }

  return (
    <FormBanner tone="success" className="mb-3">
      <span className="font-semibold">Everything adds up.</span> {money(held)} is accounted for
      below.
    </FormBanner>
  );
};

const MoneyBreakdownRows = ({ moneyBreakdown }: { moneyBreakdown: MoneyBreakdown }) => {
  const { collected, refunded, held, unexplained } = moneyBreakdown;

  return (
    <>
      <BreakdownVerdict moneyBreakdown={moneyBreakdown} />
      <MetricLinkRow
        to={LEDGER_PATH}
        search={{ range: BREAKDOWN_RANGE }}
        label="Money collected"
        detail={`${money(refunded)} refunded, leaving ${money(held)}.`}
        value={money(collected)}
      />
      {toBreakdownRows(moneyBreakdown).map(({ label, detail, amount, ledgerFilter }) =>
        ledgerFilter ? (
          <MetricLinkRow
            key={label}
            to={LEDGER_PATH}
            search={{ range: BREAKDOWN_RANGE, ...ledgerFilter }}
            label={label}
            detail={detail}
            value={money(amount)}
          />
        ) : (
          <MetricRow key={label} label={label} detail={detail} value={money(amount)} />
        ),
      )}
      {unexplained !== FULLY_EXPLAINED && (
        <MetricRow
          label="Not traced"
          detail="Money that doesn't match any record above."
          value={money(unexplained)}
        />
      )}
    </>
  );
};

export const MoneyBreakdownSection = () => {
  const {
    data: moneyBreakdown,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["money-breakdown", BREAKDOWN_RANGE],
    queryFn: () => financialRollupApi.getMoneyBreakdown(BREAKDOWN_RANGE),
    retry: false,
  });

  if (error) {
    return (
      <MetricSection title="Where the money went">
        <p className="text-sm text-muted-foreground">
          This section isn&apos;t available for your role.
        </p>
      </MetricSection>
    );
  }

  return (
    <MetricSection
      title="Where the money went"
      description="Orders paid in the last 30 days, followed all the way through."
    >
      {isLoading && (
        <p className="text-sm text-muted-foreground" role="status">
          Adding it up…
        </p>
      )}
      {moneyBreakdown && <MoneyBreakdownRows moneyBreakdown={moneyBreakdown} />}
      <Link
        to="/financial-rollup"
        className="mt-3 inline-block text-sm font-medium text-foreground underline underline-offset-2"
      >
        Open the financial rollup
      </Link>
    </MetricSection>
  );
};
