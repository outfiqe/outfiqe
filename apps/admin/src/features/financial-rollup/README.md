# Financial rollup

## Purpose

The admin screen for reconciling gateway money (what payment providers actually collected) with
ledger money (what the settlement ledger says is owed to creators/brands) — the plan's §6 check
that the two stay consistent. See `apps/api/src/modules/financial-rollup/README.md` for how each
number is computed.

## Structure

- `api.ts` / `schemas.ts` — `GET /admin/financial-rollup?range=`.
- `FinancialRollupPage.tsx` — range tabs (this cycle / 30 days / all time) plus the gateway-vs-
  ledger side-by-side cards.

## Funnel

**Admin-facing:** pick a range, see gross collected/refunded/net held on one side and what's
pending/available/withdrawn for creators and brands on the other. A close-to-zero gap between
gateway net held and total ledger amounts owed is the healthy state; a persistent gap is what
this screen exists to surface.
