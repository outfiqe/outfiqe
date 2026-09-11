import {
  Button,
  FormBanner,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from "@outfiqe/design-system";
import { useInfiniteCursorPage } from "@outfiqe/hooks";
import type { BrandPayoutStatus, PaymentMethod } from "@outfiqe/types";
import { useState } from "react";

import { financialRollupApi } from "./api";
import {
  BRAND_PAYOUT_STATUS_LABEL,
  BRAND_PAYOUT_STATUS_ORDER,
  money,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_ORDER,
} from "./constants";
import type { LedgerFilters, LedgerRow } from "./schemas";

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString();
const amountOrDash = (amount: number | null) => (amount === null ? "—" : money(amount));

const columns: TableColumn<LedgerRow>[] = [
  { key: "date", header: "Date", render: (row) => dateLabel(row.createdAt) },
  { key: "method", header: "Method", render: (row) => PAYMENT_METHOD_LABEL[row.paymentMethod] },
  {
    key: "gross",
    header: "Gross",
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
    header: "Creator commission",
    align: "right",
    render: (row) => amountOrDash(row.creatorCommissionAmount),
  },
  {
    key: "brandNet",
    header: "Brand net",
    align: "right",
    render: (row) => amountOrDash(row.brandNetAmount),
  },
  {
    key: "status",
    header: "Status",
    render: (row) =>
      row.brandPayoutStatus ? BRAND_PAYOUT_STATUS_LABEL[row.brandPayoutStatus] : "—",
  },
];

const sumField = (entries: LedgerRow[], field: keyof LedgerRow) =>
  entries.reduce((total, entry) => {
    const value = entry[field];
    return typeof value === "number" ? total + value : total;
  }, 0);

export const LedgerTable = () => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [brandPayoutStatus, setBrandPayoutStatus] = useState<BrandPayoutStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters: LedgerFilters = {
    paymentMethod: paymentMethod || undefined,
    brandPayoutStatus: brandPayoutStatus || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteCursorPage(["financial-ledger", filters], (cursor) =>
      financialRollupApi.getLedger(filters, cursor),
    );

  const entries = data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
        Order ledger
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        One row per order item, every fee, filterable by payment method, payout status, and date.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Select
          aria-label="Filter by payment method"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | "")}
          className="h-9 w-auto"
        >
          <option value="">All payment methods</option>
          {PAYMENT_METHOD_ORDER.map((method) => (
            <option key={method} value={method}>
              {PAYMENT_METHOD_LABEL[method]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by brand payout status"
          value={brandPayoutStatus}
          onChange={(event) => setBrandPayoutStatus(event.target.value as BrandPayoutStatus | "")}
          className="h-9 w-auto"
        >
          <option value="">All payout statuses</option>
          {BRAND_PAYOUT_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <input
          type="date"
          aria-label="From date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground"
        />
        <input
          type="date"
          aria-label="To date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-foreground"
        />
      </div>

      <div className="mt-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}

        {isError && <FormBanner>Couldn&apos;t load the ledger.</FormBanner>}

        {!isLoading && !isError && (
          <>
            <Table
              columns={columns}
              rows={entries}
              rowKey={(row) => row.orderItemId}
              emptyState="No orders match these filters yet."
              footer={
                <tr>
                  <td className="px-4 py-2.5" colSpan={2}>
                    Totals (loaded rows)
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {money(sumField(entries, "grossAmount"))}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {money(sumField(entries, "platformFee"))}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {money(sumField(entries, "gatewayFee"))}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {money(sumField(entries, "creatorCommissionAmount"))}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {money(sumField(entries, "brandNetAmount"))}
                  </td>
                  <td className="px-4 py-2.5" />
                </tr>
              }
            />

            {hasNextPage && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
