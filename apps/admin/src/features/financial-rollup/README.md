# Financial rollup

## Purpose

The admin screen for reconciling gateway money (what payment providers actually collected) with
ledger money (what the settlement ledger says is owed to creators/brands), broken down by payment
method, alongside the attributed-order-share headline number and a filterable, exportable
order-level ledger. See `apps/api/src/modules/financial-rollup/README.md` for how each number is
computed.

## Structure

- `api.ts` — `GET /admin/financial-rollup?range=` and `GET /admin/financial-rollup/ledger`
  (paginated, filterable; `getLedger` builds the query string itself rather than relying on a
  library, since filters are optional and cursor-driven).
- `schemas.ts` — Zod validation for both response shapes (`financialRollupSchema`,
  `ledgerPageSchema`) and the `LedgerFilters` type the UI passes to `api.ts`.
- `constants.ts` — payment-method/brand-payout-status label maps and the shared `money`/`percent`
  formatters, used by both `FinancialRollupPage` and `LedgerTable`.
- `FinancialRollupPage.tsx` — range tabs (this cycle / 30 days / all time), the attributed-order-
  share stat card, the gateway-vs-ledger side-by-side cards, the GMV-by-payment-method breakdown,
  and the `LedgerTable`.
- `LedgerTable.tsx` — filters (payment method, brand payout status, date range), the order-level
  table itself (via the shared `@outfiqe/design-system` `Table`), a "loaded rows" totals footer,
  and cursor-paginated "Load more" via `useInfiniteCursorPage`.

## Funnel

**Admin-facing:** pick a range, see the attributed-order-share number up top, gross
collected/refunded/net held on one side and what's pending/available/withdrawn for creators and
brands on the other, then GMV split by COD/eSewa/Khalti with each method's realized take rate.
Below that, filter and page through every order item's fees, or export the current filter to CSV.
A close-to-zero gap between gateway net held and total ledger amounts owed is the healthy state; a
persistent gap is what the gateway/ledger cards exist to surface.

**Technical:** `FinancialRollupPage` fetches the rollup once per range via `financialRollupApi.get`
and renders its own panels plus `<LedgerTable />`; `LedgerTable` owns its own filter state and
fetches the ledger independently via `financialRollupApi.getLedger`, so changing a ledger filter
never refetches the rollup tiles above it (and vice versa).

## Non-obvious rationale

- **The ledger's footer totals are explicitly labeled "Totals (loaded rows)", not "Totals."** They
  sum only the pages fetched so far via `useInfiniteCursorPage`, not the full filtered result set
  server-side — a true full-filtered-set total would need a separate aggregate query. Labeling it
  honestly was judged better than either building that extra query for Phase 1 or silently
  presenting a partial sum as if it were complete.
- **`constants.ts` exists because `PAYMENT_METHOD_LABEL`/`money`/`percent` moved out of
  `FinancialRollupPage.tsx`** once `LedgerTable.tsx` needed them too — matches this repo's rule
  that a module-local helper only gets extracted once a second consumer actually needs it, not
  ahead of time.
- **The order ledger's `Table` component lives in `@outfiqe/design-system`, not locally in this
  feature**, even though this is the only feature using it today — no table/data-grid primitive
  existed anywhere in this codebase before this, and it's a genuinely reusable UI primitive (per
  this repo's design-system-first rule), not bespoke chrome specific to this page.
