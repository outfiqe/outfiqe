# Financial Rollup

## Purpose

One admin screen answering "where is our money right now" — reconciling gateway-collected money
(what eSewa/Khalti/COD actually settled) against what the ledger says is owed to brands and
creators, and how much platform revenue has actually been realized. No single existing queue
(orders, commissions, brand-payouts, withdraw) answers this on its own; this module is pure
read-only aggregation over their tables, owns none of its own.

## Structure

- `financialRollup.routes.ts` — `GET /` (admin-only), `?range=cycle|30d|all`.
- `financialRollup.controller.ts` — reads the validated query, calls the service.
- `financialRollup.service.ts` — resolves `range` to a `since` cutoff date (or `null` for `all`)
  and composes the gateway/ledger halves of the view.
- `financialRollup.repository.ts` — the aggregation queries themselves.
- `financialRollup.schemas.ts` — Zod validation.
- `financialRollup.types.ts` — the view shape.

## Funnel

**User-facing:** an admin picks a range tab and sees gateway-side numbers next to ledger-side
numbers, side by side.

**Technical:** `financialRollup.routes.ts` → `financialRollup.controller.ts` →
`financialRollup.service.ts` → `financialRollup.repository.ts` → Postgres.

## Non-obvious rationale

- **Gateway-side sums use raw SQL, not the Prisma query builder.** `PaymentTransaction` has no
  `amount` column (see `payments/README.md` — a payment/refund's amount is its order's `total`,
  consistent with this codebase's all-or-nothing refund model), so "gross collected" requires
  summing a _joined_ table's column, which Prisma's `aggregate`/`groupBy` can't express (they only
  aggregate fields on the model being queried). This is exactly the "ORM genuinely can't express
  it → raw SQL" case this codebase's query-preference order already documents (see
  `creatorLook.repository.ts` for other precedent). A real `SUM()` also avoids pulling every
  matching row into memory for the `all` range, which could be the whole table.
- **Ledger-side sums (`owedToBrands`/`owedToCreators`) use `groupBy` directly** — no join needed
  there, so the ORM query builder is sufficient and preferred.
- **`range` filters every sum by `createdAt`, uniformly** — the design doc time-boxes the gateway
  side (a flow, naturally time-boxed) but is less explicit about the ledger side (more of a
  snapshot). Applying the same cutoff to both keeps the numbers comparable ("what happened this
  cycle" on both sides) rather than mixing a windowed gateway number against an all-time ledger
  number. `cycle` is interpreted as the current calendar month — the doc doesn't pin this down
  further, so it's easy to revisit if the real intent differs.
