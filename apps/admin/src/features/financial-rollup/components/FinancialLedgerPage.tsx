import { Button, FilterChip, FormBanner } from "@outfiqe/design-system";
import { useInfiniteCursorPage } from "@outfiqe/hooks";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";

import { financialRollupApi } from "../api/financialRollupApi";
import { ROLLUP_RANGE_LABEL, ROLLUP_RANGE_ORDER } from "../constants/financialRollup.constants";
import { useLedgerExport } from "../hooks/useLedgerExport";
import { useLedgerFilters } from "../hooks/useLedgerFilters";
import { LedgerFilterBar } from "./LedgerFilterBar";
import { LedgerItemDrawer } from "./LedgerItemDrawer";
import { LedgerTable } from "./LedgerTable";

const FIRST_PAGE_INDEX = 0;

export const FinancialLedgerPage = () => {
  const ledgerFilters = useLedgerFilters();
  const { filters, range, setRange, hasDateConflict, hasPickedDates } = ledgerFilters;
  const [openOrderItemId, setOpenOrderItemId] = useState<string | null>(null);
  const { exportLedger, isExporting } = useLedgerExport(filters);

  const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteCursorPage(
      ["financial-ledger", filters],
      (cursor) => financialRollupApi.getLedger(filters, cursor),
      !hasDateConflict,
    );

  const entries = data?.pages.flatMap((page) => page.entries) ?? [];
  const totals = data?.pages[FIRST_PAGE_INDEX]?.totals;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/financial-rollup"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Financial rollup
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Order ledger</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One row for every item sold, with every fee. Click a row to see the full story.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void exportLedger()}
            isLoading={isExporting}
            disabled={hasDateConflict}
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLLUP_RANGE_ORDER.map((rangeOption) => (
          <FilterChip
            key={rangeOption}
            isSelected={!hasPickedDates && range === rangeOption}
            onClick={() => setRange(rangeOption)}
            disabled={hasPickedDates}
          >
            {ROLLUP_RANGE_LABEL[rangeOption]}
          </FilterChip>
        ))}
      </div>

      <LedgerFilterBar ledgerFilters={ledgerFilters} />

      {hasDateConflict && (
        <FormBanner>
          The &quot;from&quot; date must be on or before the &quot;to&quot; date.
        </FormBanner>
      )}
      {isError && !hasDateConflict && <FormBanner>Couldn&apos;t load the ledger.</FormBanner>}

      {!isError && !hasDateConflict && (
        <>
          <LedgerTable
            entries={entries}
            totals={totals}
            isLoading={isLoading}
            onOpenItem={setOpenOrderItemId}
          />

          {hasNextPage && (
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              isLoading={isFetchingNextPage}
              className="mx-auto"
            >
              Load more
            </Button>
          )}
        </>
      )}

      {openOrderItemId && (
        <LedgerItemDrawer orderItemId={openOrderItemId} onClose={() => setOpenOrderItemId(null)} />
      )}
    </div>
  );
};
