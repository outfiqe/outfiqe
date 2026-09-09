# Financial Rollup

## Purpose

One admin surface answering "where is our money right now, and where did each rupee of it come
from" — reconciling gateway-collected money (what eSewa/Khalti/COD actually settled) against what
the ledger says is owed to brands and creators, how much platform revenue has actually been
realized (broken down by payment method), how much of that revenue was given back out as
platform-funded coupon spend, what share of orders are creator-attributed, and — down at the
individual order-item level — an exportable, filterable trace of every fee on every item. No
single existing queue (orders, commissions, brand-payouts, withdraw, coupons) answers this on its
own; this module is pure read-only aggregation over their tables, owns none of its own.

## Structure

- `financialRollup.routes.ts` — `GET /` (admin-only, `?range=cycle|30d|all`), `GET /ledger`
  (paginated, filterable), `GET /ledger/export` (same filters, unpaginated CSV, capped).
- `financialRollup.controller.ts` — reads the validated query, calls the service; `exportLedger`
  additionally logs the export event and sets the CSV response headers.
- `financialRollup.service.ts` — resolves `range` to a `since` cutoff date (or `null` for `all`),
  composes the rollup view, and owns ledger cursor encode/decode and the export row-cap check.
- `financialRollup.repository.ts` — the aggregation and ledger queries themselves.
- `financialRollup.constants.ts` — which `BrandPayoutStatus` / `CommissionStatus` values count as
  still-owed, plus the ledger page-size/export-row-cap constants.
- `financialRollup.utils.ts` — pure helpers: `sumStatusBuckets`, `buildPaymentMethodBreakdown`,
  `buildAttributionView`, the ledger cursor encode/decode pair, and `toLedgerCsv`.
- `financialRollup.schemas.ts` — Zod validation for all three routes.
- `financialRollup.types.ts` — the rollup view shape, the ledger row/page shape, and the small
  per-payment-method / attribution aggregate shapes the repository returns before they're folded
  into the view.

## Funnel

**User-facing:** an admin picks a range tab and sees the attributed-order-share headline number,
gateway-side numbers next to ledger-side numbers, a GMV-by-payment-method breakdown, and — below
all of that — a filterable, paginated order-level ledger table they can export to CSV.

**Technical:** `financialRollup.routes.ts` → `financialRollup.controller.ts` →
`financialRollup.service.ts` → `financialRollup.repository.ts` → Postgres. The ledger and export
routes share the same repository query (`listLedger`) and the same filter shape
(`financialLedgerQuerySchema`/`financialLedgerExportQuerySchema` share a base `ledgerFilterFields`
object) — export is just "the ledger query with no cursor, a much higher row cap, and CSV instead
of JSON" rather than a separate code path.

## Non-obvious rationale

- **Gateway-side sums use raw SQL, not the Prisma query builder.** `PaymentTransaction` has no
  `amount` column (see `payments/README.md` — a payment/refund's amount is its order's `total`,
  consistent with this codebase's all-or-nothing refund model), so "gross collected" requires
  summing a _joined_ table's column, which Prisma's `aggregate`/`groupBy` can't express (they only
  aggregate fields on the model being queried). This is exactly the "ORM genuinely can't express
  it → raw SQL" case this codebase's query-preference order already documents (see
  `creatorLook.repository.ts` for other precedent). A real `SUM()` also avoids pulling every
  matching row into memory for the `all` range, which could be the whole table. The same reasoning
  extends to `sumOrderTotalsByPaymentMethod` (needs `orders.payment_method`, a joined column) and
  `sumRealizedBrandPayoutFeesByPaymentMethod`/`sumAttributionCounts` (need a
  `brand_payouts`/`order_items` → `orders` join).
- **Ledger-side per-status sums use `groupBy` directly** — no join needed there, so the ORM query
  builder is sufficient and preferred.
- **`owedToBrands`/`owedToCreators` count only the genuinely-outstanding statuses, not every
  bucket.** The per-status breakdown (`brandPayoutsByStatus`/`creatorCommissionsByStatus`) carries
  every `groupBy` bucket for the detail table on `FinancialRollupPage`, but a `WITHDRAWN`/`PAID`
  payout is money that has already left the platform and a `VOIDED` one was never owed — summing
  those into "owed" (as the frontend used to, adding up the whole record) overstated the liability
  and manufactured a settlement gap against `gateway.netHeld`. So the two scalar `owed*` numbers
  are computed here from `OUTSTANDING_BRAND_PAYOUT_STATUSES` (`PENDING`, `AVAILABLE`) and
  `OUTSTANDING_COMMISSION_STATUSES` (`PENDING`, `APPROVED`, `AVAILABLE`) — `PENDING` is included
  because that money is currently held and will most likely be paid, which is exactly what the gap
  check against `netHeld` is meant to reflect. Business logic for "which statuses count as owed"
  lives here, not in the admin app.
- **`range` filters every sum by `createdAt`, uniformly** — the design doc time-boxes the gateway
  side (a flow, naturally time-boxed) but is less explicit about the ledger side (more of a
  snapshot). Applying the same cutoff to both keeps the numbers comparable ("what happened this
  cycle" on both sides) rather than mixing a windowed gateway number against an all-time ledger
  number. `cycle` is interpreted as the current calendar month — the doc doesn't pin this down
  further, so it's easy to revisit if the real intent differs.
- **`couponSpend` sums `CouponRedemption.platformFundedAmount` for non-`RELEASED` rows** — a
  cancelled order's coupon is released (`../coupons/README.md`) and its budget/spend given back, so
  counting it here too would double-count money that was never actually kept by the customer.
  `netPlatformRevenue` is simply `platformRevenueRealized − couponSpend`: the platform's own realized
  take-rate revenue, treated as contra-revenue against what was spent funding coupon discounts —
  matching the spec's framing of a coupon as a marketing spend line, not a discount to platform
  revenue that was never earned in the first place (a coupon order's `BrandPayout` is untouched, so
  `platformRevenueRealized` itself already doesn't move because of a coupon).
- **`byPaymentMethod.realizedTakeRate` is `(platformFee − gatewayFee) / gmv`, deliberately not the
  flat commission rate.** The platform commission rate a brand pays is one number regardless of
  payment method; what varies per method is the platform's own _realized_ margin — full rate on
  COD (no gateway fee), rate-minus-gateway-fee on eSewa/Khalti. This is the number that makes that
  gap visible per method instead of buried in one blended figure. `gmv`/fees only count `WITHDRAWN`
  payouts ("realized", matching `sumRealizedPlatformFee`'s existing definition), not every payout
  regardless of status.
- **The order-level ledger's "gross" column is `BrandPayout.grossAmount` (item-level), not the
  order's own `total` (order-level).** `PaymentTransaction`/`Order.total` are order-level while
  `BrandPayout`/`CreatorCommission` are one-row-per-`OrderItem` — an earlier draft of this feature
  planned to show the order's total on the ledger's first-item-per-order row only, to avoid
  double-counting a multi-item order's total across its rows. Using `BrandPayout.grossAmount`
  sidesteps that entirely: it's already a coherent per-item money figure (gross minus platform fee
  equals brand net, independent of how many other items share the same order), so summing the
  ledger's `gross` column across filtered rows is never double-counted, and no per-order grouping
  logic is needed. It won't sum to exactly the order's `total` for a multi-item order (delivery
  fee/COD fee aren't allocated to any item) — that's expected; the ledger's `gross` is a per-item
  settlement figure, not a repeat of the order-level GMV tile.
- **`listLedger` is a `LEFT JOIN` from `order_items`, not an `INNER JOIN` driven by
  `brand_payouts`.** An order item with no linked payout/commission yet (still processing, or a
  historical data gap) still shows up as its own row with those fields `null`, rather than
  silently vanishing from the ledger — matches this codebase's resilience rule against dropping
  partial/incomplete records rather than surfacing them.
- **Ledger pagination is hand-rolled keyset pagination `(oi.created_at, oi.id) < (cursor)`, not
  Prisma's `cursor`/`skip`.** Prisma's cursor pagination requires the query to be a `findMany` on
  a single model with a unique cursor field; this is a raw multi-table join, so the cursor is a
  base64url-encoded `{ createdAt, orderItemId }` pair (`encodeLedgerCursor`/`decodeLedgerCursor`)
  compared as a tuple — the same pattern this repo already uses for simpler cursor pagination
  (`withdraw.repository.ts`, `crm-audit.repository.ts`), just implemented by hand because the data
  source isn't a single Prisma model. A cursor that fails to decode raises a 400 `AppError`
  (`INVALID_LEDGER_CURSOR`) rather than silently restarting the page from the beginning, which
  would be a confusing, undetectable pagination bug from the client's point of view.
- **Export reuses `listLedger` with `limit = MAX_LEDGER_EXPORT_ROWS` and no cursor, then rejects
  (400) rather than truncates when the result still exceeds the cap.** Silently truncating an
  export would ship a BA an incomplete CSV with no indication anything was cut — worse than making
  them narrow their filters. CSV serialization (`toLedgerCsv`) is genuinely new, module-local code:
  nothing else in this codebase exports CSV today.
- **Export audit logging is a structured `logger.info()` line (exporter id, filter, row count),
  not a new persisted audit table.** The only existing audit log in this codebase, `crm-audit`, is
  hard-scoped to CRM/Organization actions (invites, roles, ownership transfers, subscriptions) —
  it has no natural slot for "admin exported N ledger rows," and building a new persisted,
  queryable audit table for a single event type was judged disproportionate for Phase 1. If export
  activity ever needs to be reviewable inside the admin UI rather than just in logs, that's the
  trigger to revisit this.
- **`sumAttributionCounts` scopes to order items on orders with at least one successful `PAYMENT`
  transaction (via `EXISTS`, not a `JOIN`)** — the same "real, settled order" population the GMV
  tiles use, so the attributed-order-share headline number is comparable to GMV rather than
  counting every order item ever created regardless of whether it was ever paid for. `EXISTS` (not
  a `JOIN`) avoids double-counting an order item if an order somehow has more than one successful
  transaction row.
