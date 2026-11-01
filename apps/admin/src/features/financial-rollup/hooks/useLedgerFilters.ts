import { useDebouncedValue } from "@outfiqe/hooks";
import type { BrandPayoutStatus, CommissionStatus, PaymentMethod } from "@outfiqe/types";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { oneOfFilter, rawTextFilter, useSearchFilter } from "@/lib/useSearchFilter";

import {
  type LedgerFilters,
  type LedgerFocus,
  ledgerFocusValues,
  type RollupRange,
} from "../api/financialRollupSchemas";
import {
  BRAND_PAYOUT_STATUS_ORDER,
  COMMISSION_STATUS_ORDER,
  DEFAULT_ROLLUP_RANGE,
  PAYMENT_METHOD_ORDER,
  ROLLUP_RANGE_ORDER,
} from "../constants/financialRollup.constants";

const NO_FILTER = "";
const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

export const ROLLUP_RANGE_FILTER = oneOfFilter<RollupRange>(
  ROLLUP_RANGE_ORDER,
  DEFAULT_ROLLUP_RANGE,
);
const PAYMENT_METHOD_FILTER = oneOfFilter<PaymentMethod | typeof NO_FILTER>(
  PAYMENT_METHOD_ORDER,
  NO_FILTER,
);
const BRAND_PAYOUT_STATUS_FILTER = oneOfFilter<BrandPayoutStatus | typeof NO_FILTER>(
  BRAND_PAYOUT_STATUS_ORDER,
  NO_FILTER,
);
const COMMISSION_STATUS_FILTER = oneOfFilter<CommissionStatus | typeof NO_FILTER>(
  COMMISSION_STATUS_ORDER,
  NO_FILTER,
);
const LEDGER_FOCUS_FILTER = oneOfFilter<LedgerFocus | typeof NO_FILTER>(
  ledgerFocusValues,
  NO_FILTER,
);

export const useLedgerFilters = () => {
  const navigate = useNavigate();
  const [range, setRange] = useSearchFilter("range", ROLLUP_RANGE_FILTER);
  const [paymentMethod, setPaymentMethod] = useSearchFilter("method", PAYMENT_METHOD_FILTER);
  const [brandPayoutStatus, setBrandPayoutStatus] = useSearchFilter(
    "payout",
    BRAND_PAYOUT_STATUS_FILTER,
  );
  const [commissionStatus, setCommissionStatus] = useSearchFilter(
    "commission",
    COMMISSION_STATUS_FILTER,
  );
  const [focus, setFocus] = useSearchFilter("focus", LEDGER_FOCUS_FILTER);
  const [dateFrom, setDateFrom] = useSearchFilter("from", rawTextFilter);
  const [dateTo, setDateTo] = useSearchFilter("to", rawTextFilter);
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, SEARCH_DEBOUNCE_MS).trim();

  const hasDateConflict = dateFrom !== "" && dateTo !== "" && dateFrom > dateTo;
  const hasPickedDates = dateFrom !== "" || dateTo !== "";

  const filters: LedgerFilters = {
    range: hasPickedDates ? undefined : range,
    paymentMethod: paymentMethod || undefined,
    brandPayoutStatus: brandPayoutStatus || undefined,
    commissionStatus: commissionStatus || undefined,
    focus: focus || undefined,
    search: debouncedSearchText.length >= MIN_SEARCH_LENGTH ? debouncedSearchText : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const clearFilters = () => {
    setSearchText("");
    void navigate({ to: ".", search: {}, replace: true });
  };

  return {
    filters,
    range,
    setRange,
    paymentMethod,
    setPaymentMethod,
    brandPayoutStatus,
    setBrandPayoutStatus,
    commissionStatus,
    setCommissionStatus,
    focus,
    setFocus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchText,
    setSearchText,
    hasDateConflict,
    hasPickedDates,
    clearFilters,
  };
};
