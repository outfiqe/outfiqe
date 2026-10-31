import { createFileRoute } from "@tanstack/react-router";

import { FinancialLedgerPage } from "@/features/financial-rollup/components/FinancialLedgerPage";
import { toLedgerSearch } from "@/features/financial-rollup/utils/ledgerSearch.utils";

export const Route = createFileRoute("/_authenticated/financial-rollup/ledger")({
  validateSearch: toLedgerSearch,
  component: FinancialLedgerPage,
});
