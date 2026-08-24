# Brand Payouts

## Purpose

The brand-side settlement ledger — the mirror of `commissions`' `CreatorCommission` ledger, but
for a brand's cut of a sale instead of a creator's. Owns the platform take-rate ladder
(`PlatformCommissionRule` + `PlatformCommissionTier`), the per-transaction gateway fee estimate
(`GatewayFeeRate`), time-boxed brand exemptions (`BrandCommissionExemption`), and the per-order-item
payable snapshot (`BrandPayout`) that a brand's withdrawable balance is summed from (see the
`withdraw` module).

## Structure

- `brandPayout.routes.ts` — `GET /me/summary`, `GET /me` (brand member); `GET/POST
/commission-rules`, `GET/POST /gateway-fee-rates`, `GET/POST /exemptions`, `PATCH
/exemptions/:id/revoke` (admin).
- `brandPayout.controller.ts` — resolves the caller's brand via `requireBrandId`, reads validated
  input, calls the service.
- `brandPayout.service.ts` — summary/ledger listing for a brand; creates a new active commission
  rule (percent input converted to basis points per tier), gateway fee rate versions, and brand
  exemptions.
- `brandPayout.repository.ts` — Prisma queries: rule + tier CRUD, gateway fee rate CRUD, exemption
  CRUD and the batched `findActiveExemptBrandIds` lookup, the checkout-time `createPending`, the
  lifecycle-sweep queries (`findApprovableIds`/`findVoidableFor*Ids`, `approve`, `void`), the
  cancel-transaction `voidForOrder`, and the balance aggregation (`sumByStatusForBrand`).
- `brandPayout.lifecycle.ts` — `runBrandPayoutLifecycleSweep`, this module's own
  `PENDING → AVAILABLE`/`VOIDED` sweep, wired into `apps/api/src/jobs/scheduled-jobs.ts` as a
  sibling `brand-payout-lifecycle` job entry running on the same `COMMISSION_SWEEP_INTERVAL_MS`
  cadence as `commissions`' sweep (not a shared function — each module owns its own lifecycle
  logic, per this repo's module-boundary convention — just the same schedule).
- `brandPayout.schemas.ts` — Zod validation, including the whole-ladder contiguity check on
  `createPlatformCommissionRuleSchema` (see Non-obvious rationale).
- `brandPayout.types.ts` — DB-shaped and view types.
- `brandPayout.utils.ts` — `computeTieredPlatformFee` (single-band-match lookup + the FLAT/PERCENT
  fee math), `computeGatewayFee` (COD always `0`), view mappers.
- `brandPayout.constants.ts` — `BASIS_POINTS_PER_PERCENT`.

Shares `settleIds` (the per-id try/settle/log loop both this module's and `commissions`' sweep
need) with `commissions` via `#lib/lifecycle-sweep.utils.js`.

## Funnel

**User-facing:** a brand sees their payout summary/ledger inside the brand wallet screen
(`withdraw` + `brand-bank-accounts` features). An admin configures the commission ladder, gateway
fee estimates, and brand exemptions from the admin console's Platform commission page
(`apps/admin/src/features/platform-commission`).

**Technical:** at checkout (`order.service.ts`'s `checkoutOnce`), for every distinct brand in the
cart the service looks up whether that brand has an active exemption
(`findActiveExemptBrandIds`, batched once per checkout, not once per line item). For every order
item it then computes `platformFee` via `computeTieredPlatformFee` against the active rule's tiers
(or `0` if the brand is exempt) and `gatewayFee` via `computeGatewayFee` against the active
`GatewayFeeRate` for the order's payment method (or `0` unconditionally for `COD`), and creates one
`BrandPayout` row — for every line item, regardless of creator attribution, unlike commissions
which only exist for attributed sales. `orderService.cancel`'s transaction voids `PENDING` payouts
the same way it already voids `PENDING` commissions. `runBrandPayoutLifecycleSweep`
(`brandPayout.lifecycle.ts`) runs the `PENDING → AVAILABLE`/`VOIDED` sweep on the same interval
`commissions`' sweep already uses.

## Non-obvious rationale

- **Tiers are single-band-match, not marginal/cumulative brackets** — an item priced inside a given
  band pays that band's flat amount or percent of the _whole_ price, not a blended rate across
  bands (an income-tax-style marginal ladder). Matches the pre-existing `CommissionTier` model this
  module's ladder is modeled after, and was explicitly confirmed against a real example (a Rs 1500
  item in a "5%, 1000–2000" band pays flat Rs 75, not a blend with the 0–1000 band).
- **A brand exemption waives the platform fee only, never the gateway fee estimate** — the gateway
  fee is a pass-through cost the platform actually incurs with the payment processor, not part of
  the platform's own take; an exempt brand still nets `grossAmount − gatewayFee`.
- **Submitting a new tier ladder replaces the whole set atomically, not per-tier CRUD** — matches
  this codebase's existing versioned-config pattern (`WithdrawPolicy`,
  `createActiveRuleVersion`/`createActiveGatewayFeeRateVersion`): the previous
  `PlatformCommissionRule` (with all its tiers) is deactivated and a brand-new rule + tier set is
  created in one transaction. A past `BrandPayout.commissionRuleId`/`platformCommissionTierId`
  always points at the exact rate that applied when it was created — later edits never retroactively
  touch it.
- **`createPlatformCommissionRuleSchema` enforces the whole ladder is contiguous, starts at Rs 0,
  and the top band is open-ended** before it can ever become active — a gap would mean some price
  has no matching tier, which `computeTieredPlatformFee` treats as a hard error at checkout time
  rather than silently charging `0`. Validating this at submission time, not checkout time, is the
  only way to guarantee it never happens in production.
- **Gateway fee rates are versioned per `PaymentMethod`, scoped to `ESEWA`/`KHALTI` only** — `COD`
  is hardcoded to `computeGatewayFee` returning `0` in code, never a configurable row, so an admin
  can never accidentally enter a nonsensical "estimate" for a cash transaction.
- **Exemptions are time-boxed (`startsAt`/`endsAt`) plus an independent `revokedAt`** — an admin can
  end an exemption early (`revokedAt`) without having to know or edit its originally-planned end
  date. `findActiveExemptBrandIds` checks both: `startsAt <= now <= endsAt AND revokedAt IS NULL`.
  Revoking (or letting an exemption expire) only affects _future_ checkouts — it never touches
  `BrandPayout` rows already created while the exemption was active, matching the snapshot-at-
  checkout principle above.
- Checkout throws a `503` if no `PlatformCommissionRule` is active — this should never happen in
  practice (one is seeded, see `prisma/seed.ts`), but failing the whole checkout loudly is safer
  than silently creating a payable with an undefined take-rate.
