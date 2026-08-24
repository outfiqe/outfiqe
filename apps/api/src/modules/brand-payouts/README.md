# Brand Payouts

## Purpose

The brand-side settlement ledger — the mirror of `commissions`' `CreatorCommission` ledger, but
for a brand's cut of a sale instead of a creator's. Defines the platform take-rate
(`PlatformCommissionRule`) and the per-order-item payable snapshot (`BrandPayout`) that a
brand's withdrawable balance is summed from (see the `withdraw` module).

## Structure

- `brandPayout.routes.ts` — `GET /me/summary`, `GET /me` (brand member); `GET /commission-rules`,
  `POST /commission-rules` (admin).
- `brandPayout.controller.ts` — resolves the caller's brand via `requireBrandId`, reads validated
  input, calls the service.
- `brandPayout.service.ts` — summary/ledger listing for a brand; creates a new active commission
  rule (percent input converted to basis points).
- `brandPayout.repository.ts` — Prisma queries: rule CRUD, the checkout-time `createPending`, the
  lifecycle-sweep queries (`findApprovableIds`/`findVoidableFor*Ids`, `approve`, `void`), the
  cancel-transaction `voidForOrder`, and the balance aggregation (`sumByStatusForBrand`).
- `brandPayout.lifecycle.ts` — `runBrandPayoutLifecycleSweep`, this module's own
  `PENDING → AVAILABLE`/`VOIDED` sweep, wired into `apps/api/src/jobs/scheduled-jobs.ts` as a
  sibling `brand-payout-lifecycle` job entry running on the same `COMMISSION_SWEEP_INTERVAL_MS`
  cadence as `commissions`' sweep (not a shared function — each module owns its own lifecycle
  logic, per this repo's module-boundary convention — just the same schedule).
- `brandPayout.schemas.ts` — Zod validation.
- `brandPayout.types.ts` — DB-shaped and view types.
- `brandPayout.utils.ts` — `computePlatformFee` (the only place the basis-points math happens),
  view mappers.
- `brandPayout.constants.ts` — `BASIS_POINTS_PER_PERCENT`, `GATEWAY_FEE_BY_PROVIDER_NPR`.

Shares `settleIds` (the per-id try/settle/log loop both this module's and `commissions`' sweep
need) with `commissions` via `#lib/lifecycle-sweep.utils.js`.

## Funnel

**User-facing:** nothing on its own — a brand sees their payout summary/ledger inside the brand
wallet screen (`withdraw` + `brand-bank-accounts` features), and an admin edits the platform rate
from the admin console.

**Technical:** every order item gets one `BrandPayout` row, created inside `order.service.ts`'s
checkout transaction (`checkoutOnce`, alongside the existing `CreatorCommission` creation) —
`for every line item, regardless of creator attribution`, unlike commissions which only exist for
attributed sales. `orderService.cancel`'s transaction voids `PENDING` payouts the same way it
already voids `PENDING` commissions. `runBrandPayoutLifecycleSweep` (`brandPayout.lifecycle.ts`)
runs the `PENDING → AVAILABLE`/`VOIDED` sweep on the same interval `commissions`' sweep already
uses — reusing the existing cadence rather than standing up a third scheduler, per the design
doc's instruction, even though each module runs its own sweep function.

## Non-obvious rationale

- **`gatewayFee` is `0` for every provider right now** (`GATEWAY_FEE_BY_PROVIDER_NPR`) — no
  eSewa/Khalti API returns a real fee schedule, and no figure was supplied. `netAmount =
grossAmount − platformFee` until a real per-provider estimate is known; changing it later is a
  one-line constant change, not a schema migration.
- **`platformFee` is snapshotted at checkout, not computed live** — `BrandPayout.commissionRuleId`
  and `platformFee` are fixed at order time so a later rate change never retroactively touches an
  existing payable, exactly like `CreatorCommission.tierId`/`amount`.
- **Rate is stored as basis points (`ratePercentBasisPoints`), not a float percent** — avoids
  floating-point rounding in `platformFee = round(grossAmount * ratePercentBasisPoints / 10000)`.
  The admin-facing API still speaks in whole percent (`ratePercent`); the conversion happens once,
  in `brandPayout.service.ts`/`brandPayout.utils.ts`.
- **Creating a new commission rule deactivates the previous one in the same transaction** — same
  versioning shape as `WithdrawPolicy`, so a past `BrandPayout.commissionRuleId` always points at
  the exact rate that applied when it was created.
- Checkout throws a `503` if no `PlatformCommissionRule` is active — this should never happen in
  practice (one is seeded, see `prisma/seed.ts`), but failing the whole checkout loudly is safer
  than silently creating a payable with an undefined take-rate.
