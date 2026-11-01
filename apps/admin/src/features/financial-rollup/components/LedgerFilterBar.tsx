import { Button, DateInput, Input, Select } from "@outfiqe/design-system";
import type { BrandPayoutStatus, CommissionStatus, PaymentMethod } from "@outfiqe/types";
import type { ChangeEvent } from "react";

import type { LedgerFocus } from "../api/financialRollupSchemas";
import {
  BRAND_PAYOUT_STATUS_LABEL,
  BRAND_PAYOUT_STATUS_ORDER,
  COMMISSION_STATUS_LABEL,
  COMMISSION_STATUS_ORDER,
  LEDGER_FOCUS_LABEL,
  LEDGER_FOCUS_ORDER,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_ORDER,
} from "../constants/financialRollup.constants";
import type { useLedgerFilters } from "../hooks/useLedgerFilters";

const FILTER_CONTROL_CLASS_NAME = "h-9 w-auto";

const readValue = <Value extends string>(event: ChangeEvent<HTMLSelectElement>): Value | "" => {
  const { value } = event.target;
  return value as Value | "";
};

export const LedgerFilterBar = ({
  ledgerFilters,
}: {
  ledgerFilters: ReturnType<typeof useLedgerFilters>;
}) => {
  const { paymentMethod, setPaymentMethod, brandPayoutStatus, setBrandPayoutStatus } =
    ledgerFilters;
  const { commissionStatus, setCommissionStatus, focus, setFocus } = ledgerFilters;
  const { dateFrom, setDateFrom, dateTo, setDateTo, searchText, setSearchText } = ledgerFilters;
  const { clearFilters } = ledgerFilters;

  return (
    <div className="space-y-2">
      <Input
        aria-label="Search the ledger"
        placeholder="Search by order number, buyer, phone, product or brand"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        className="h-9"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Show"
          value={focus}
          onChange={(event) => setFocus(readValue<LedgerFocus>(event))}
          className={FILTER_CONTROL_CLASS_NAME}
        >
          <option value="">Everything</option>
          {LEDGER_FOCUS_ORDER.map((focusOption) => (
            <option key={focusOption} value={focusOption}>
              {LEDGER_FOCUS_LABEL[focusOption]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by payment method"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(readValue<PaymentMethod>(event))}
          className={FILTER_CONTROL_CLASS_NAME}
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
          onChange={(event) => setBrandPayoutStatus(readValue<BrandPayoutStatus>(event))}
          className={FILTER_CONTROL_CLASS_NAME}
        >
          <option value="">All brand payouts</option>
          {BRAND_PAYOUT_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {BRAND_PAYOUT_STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by muse commission status"
          value={commissionStatus}
          onChange={(event) => setCommissionStatus(readValue<CommissionStatus>(event))}
          className={FILTER_CONTROL_CLASS_NAME}
        >
          <option value="">All muse commissions</option>
          {COMMISSION_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {COMMISSION_STATUS_LABEL[status]}
            </option>
          ))}
        </Select>
        <DateInput
          aria-label="From date"
          max={dateTo}
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className={FILTER_CONTROL_CLASS_NAME}
        />
        <DateInput
          aria-label="To date"
          min={dateFrom}
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className={FILTER_CONTROL_CLASS_NAME}
        />
        <Button variant="outline" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    </div>
  );
};
