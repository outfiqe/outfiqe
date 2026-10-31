# Financial rollup

## Purpose

The admin screens for answering "where is the money?": what came in, who is still owed, what the
platform earned, and, down to one sold item, where each rupee went. See
`apps/api/src/modules/financial-rollup/README.md` for how each number is computed.

## Structure

- `components/FinancialRollupPage.tsx` — the `/financial-rollup` route: period chips and the summary
  sections below.
- `components/RollupMoneyCards.tsx` — the plain-sentence banner (`utils/rollupInsight.utils.ts`) and
  six clickable money cards.
- `components/PayoutStatusSections.tsx` — brand payouts and muse commissions by status, with a plain
  explanation of each status.
- `components/RollupEarningsSections.tsx` — platform earnings after coupons, sales through muses, and
  how shoppers paid.
- `components/MoneyBreakdownSection.tsx` — "Where the money went": orders paid in the last 30 days
  followed through to every destination, with a warning only for money that can't be traced. Also
  shown on the admin overview.
- `components/RollupSkeleton.tsx` — the loading state of the summary.
- `components/FinancialLedgerPage.tsx` — the `/financial-rollup/ledger` route: one row per item sold.
  `LedgerFilterBar.tsx` holds search and filters, `LedgerTable.tsx` holds the table and whole-filter
  totals, and `LedgerItemDrawer.tsx` holds the side panel with one item's full story.
- `hooks/useLedgerFilters.ts` — every ledger filter, kept in the URL so a filtered view is a link.
  `hooks/useLedgerExport.ts` downloads the current filter as a CSV.
- `constants/financialRollup.constants.ts` — plain labels and explanations, plus `money`/`percent`.
- `utils/ledgerSearch.utils.ts` — reads the ledger's URL filters for the route.
- `api/financialRollupApi.ts` / `api/financialRollupSchemas.ts` — the rollup, ledger, item and export
  calls and their Zod schemas.

Card, row and stat-card link pieces are shared with Tag reviews through
`apps/admin/src/components/MetricParts.tsx`.

## Funnel

**User-facing:** open **Financial rollup**, pick a period and read the banner. Click any card or row
to open the ledger already filtered to those items. Search, filter or pick dates, export what you
see, and click a row to read who placed the order, what was bought, where the money went, and the
payment history, with a link to the full order.

**Technical:** summary: `FinancialRollupPage` → `financialRollupApi.get` →
`GET /admin/financial-rollup`. Ledger: `useLedgerFilters` → `FinancialLedgerPage` →
`financialRollupApi.getLedger` → `GET /admin/financial-rollup/ledger`. Side panel:
`LedgerItemDrawer` → `financialRollupApi.getLedgerItem` → `GET /admin/financial-rollup/ledger/:id`.
Export: `useLedgerExport` → `apiClient.getBlob` → `GET /admin/financial-rollup/ledger/export`.

## Non-obvious rationale

- **Picked dates replace the period chips.** Sending both would make one silently win, so the chips
  turn off while a date is picked.
- **Dates go to the server as the start and end of the person's own day.** A plain `2026-10-31`
  would be read as midnight UTC and drop almost all of that last day.
- **A "from" after the "to" is explained on the page and never sent.** The server would refuse it,
  and all the page could then say is that the ledger failed to load.
- **The ledger totals cover every matching item, not just loaded pages.** They include cancelled
  items unless a brand payout status is picked, and the page says so.
- **A card's number can differ slightly from its ledger total.** Money collected counts by payment
  date and owed amounts by payout date, while the ledger filters by the date the item was sold. An
  item sold on the last day of a period and paid the next day lands in different periods.
- **Rows are clicked through a real button in the first column.** The click bubbles up to the
  table's `onRowClick`, so a keyboard user gets the same action as a mouse user.
