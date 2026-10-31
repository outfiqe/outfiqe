import { Badge, Table, type TableColumn } from "@outfiqe/design-system";
import { formatDate } from "@outfiqe/utils";

import type { LedgerRow, LedgerTotals } from "../api/financialRollupSchemas";
import {
  BRAND_PAYOUT_STATUS_LABEL,
  money,
  PAYMENT_METHOD_LABEL,
} from "../constants/financialRollup.constants";

const SINGLE_ITEM = 1;
const LEADING_COLUMN_SPAN = 3;

const amountOrDash = (amount: number | null) => (amount === null ? "—" : money(amount));

const payoutTone = ({ brandPayoutStatus }: LedgerRow) => {
  if (brandPayoutStatus === "VOIDED") return "negative";
  if (brandPayoutStatus === "WITHDRAWN") return "success";
  return "neutral";
};

const columns: TableColumn<LedgerRow>[] = [
  {
    key: "item",
    header: "Item",
    render: (row) => (
      <button
        type="button"
        className="flex w-64 cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {row.productImageUrl ? (
          <img
            src={row.productImageUrl}
            alt=""
            loading="lazy"
            className="size-10 shrink-0 rounded-md bg-muted object-cover"
          />
        ) : (
          <span className="size-10 shrink-0 rounded-md bg-muted" aria-hidden />
        )}
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground">{row.productName}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.brandName} · bought by {row.buyerName}
          </span>
        </span>
      </button>
    ),
  },
  { key: "date", header: "Date", render: (row) => formatDate(row.createdAt) },
  { key: "method", header: "Paid by", render: (row) => PAYMENT_METHOD_LABEL[row.paymentMethod] },
  {
    key: "gross",
    header: "Item value",
    align: "right",
    render: (row) => amountOrDash(row.grossAmount),
  },
  {
    key: "platformFee",
    header: "Platform fee",
    align: "right",
    render: (row) => amountOrDash(row.platformFee),
  },
  {
    key: "gatewayFee",
    header: "Gateway fee",
    align: "right",
    render: (row) => amountOrDash(row.gatewayFee),
  },
  {
    key: "creatorCommission",
    header: "Muse gets",
    align: "right",
    render: (row) => amountOrDash(row.creatorCommissionAmount),
  },
  {
    key: "brandNet",
    header: "Brand gets",
    align: "right",
    render: (row) => amountOrDash(row.brandNetAmount),
  },
  {
    key: "status",
    header: "Brand payout",
    render: (row) =>
      row.brandPayoutStatus ? (
        <Badge showDot={false} tone={payoutTone(row)}>
          {BRAND_PAYOUT_STATUS_LABEL[row.brandPayoutStatus]}
        </Badge>
      ) : (
        "—"
      ),
  },
];

const LedgerTotalsRow = ({ totals }: { totals: LedgerTotals }) => {
  const { rowCount, grossAmount, platformFee, gatewayFee, creatorCommissionAmount } = totals;
  const { brandNetAmount } = totals;

  return (
    <tr>
      <td className="px-4 py-2.5" colSpan={LEADING_COLUMN_SPAN}>
        Total for all {rowCount.toLocaleString()} item{rowCount === SINGLE_ITEM ? "" : "s"}
      </td>
      <td className="px-4 py-2.5 text-right">{money(grossAmount)}</td>
      <td className="px-4 py-2.5 text-right">{money(platformFee)}</td>
      <td className="px-4 py-2.5 text-right">{money(gatewayFee)}</td>
      <td className="px-4 py-2.5 text-right">{money(creatorCommissionAmount)}</td>
      <td className="px-4 py-2.5 text-right">{money(brandNetAmount)}</td>
      <td className="px-4 py-2.5" />
    </tr>
  );
};

export const LedgerTable = ({
  entries,
  totals,
  isLoading,
  onOpenItem,
}: {
  entries: LedgerRow[];
  totals: LedgerTotals | undefined;
  isLoading: boolean;
  onOpenItem: (orderItemId: string) => void;
}) => (
  <div>
    <Table
      caption="Order ledger"
      className="[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
      isLoading={isLoading}
      columns={columns}
      rows={entries}
      rowKey={(row) => row.orderItemId}
      onRowClick={(row) => onOpenItem(row.orderItemId)}
      emptyState="No items match these filters."
      footer={totals && <LedgerTotalsRow totals={totals} />}
    />
    {totals && (
      <p className="mt-2 text-xs text-muted-foreground">
        Totals include cancelled items. Pick a brand payout status to see one kind only.
      </p>
    )}
  </div>
);
