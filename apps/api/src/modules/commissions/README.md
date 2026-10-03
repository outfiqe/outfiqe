# Commissions

## Purpose

Fixed, price-tiered commission for a sale that came through someone else's content: a creator's
post or link (Creator Look commission) or an Outfit Build (Build commission). It owns the tier
tables admins edit, the commission rows created at checkout, their lifecycle, and the earnings
views for people and brands.

## Structure

- `commission.routes.ts` — earner routes (`/me/eligibility`, `/me/summary`, `/me`), brand routes
  (`/brand/summary`, `/brand`), and admin routes (`/tiers`, `/tiers/price-test`,
  `/tiers/history`, `/`, `/:id/approve|void|mark-paid`).
- `commission.controller.ts` — reads validated input and the signed-in person, calls the service.
- `commission.service.ts` — the earner guard, earnings summaries, tier rules (scope check, range
  check, overlap list, price test) and writing every tier change to the platform audit log.
- `commission.repository.ts` — all Prisma access: tiers, commission rows, sums by status for a
  person or a brand, and the claim helpers `withdraw` uses.
- `commission.lifecycle.ts` — the hourly sweep that approves and voids pending rows.
- `commission.utils.ts` — mappers, `splitBuildCommission`, `findOverlappingTierIds`,
  `parseCommissionTierRow`.
- `commission.constants.ts`, `commission.types.ts`, `commission.schemas.ts`.

## Funnel

**User-facing.** A shopper buys something they reached through a post, a link or a build. The
people behind it see a pending amount under Earnings; brands see build earnings in their wallet.
After the return window it becomes available and can be withdrawn. Admins set the price bands
for each kind of commission, test what a price would earn, and read the change history.

**Technical.** `orders` checkout → `resolveAttribution` (`orders/order.attribution.utils.ts`)
picks the latest click or build visit → `findTierForPrice(price, scope)` →
`resolveCommissionShares` → `commissionRepository.createPending` once per share, inside the
checkout transaction. Reads go route → controller → service (earner guard) → repository.

## Who can see `/me`

`/me` and `/me/summary` use `requireCommissionEarner` (`#lib/creator-guard.utils.js`): a shopper
account that is an approved creator, or that has at least one commission row. Build commission
goes to everyone on a build, creators or not, so a shopper who helped make a build that sold
must be able to see and withdraw it. Anyone else gets `403 NOT_A_CREATOR`.
`/me/eligibility` answers the same question as `{ canEarn }` without failing, so the web app can
decide whether to show Earnings and Withdraw. Staff and brand accounts are never earners here;
a brand's share is read through `/brand` and the brand wallet instead.

## Tiers have a scope: Creator Look or Build

`CommissionTier.scope` is `CREATOR_LOOK` or `OUTFIT_BUILD`: one commission system with two sets
of price bands. Every admin tier route takes `?scope=` (default `CREATOR_LOOK`), and editing or
deleting a tier answers `404 TIER_NOT_FOUND` when the tier belongs to the other scope, so a
screen can never change the other kind of commission by id. Tiers are snapshotted onto each
commission row, so editing a tier never changes commission already created.

The tier list returns `overlapsWithTierIds` for each tier. Overlaps are allowed (the band with
the higher minimum wins, which is what `findTierForPrice` does), but the admin screen warns
about them because they make a commission surprising. Every create, edit and delete is written
to `PlatformAuditLog` with the tier before and after, tagged with the scope in `metadata`;
`/tiers/history` reads those entries back.

## Build commission is split, and a brand's share goes to the brand

A sale from a build earns the Build tier amount once per order item, split equally among
everyone on the build when that version was locked (`OutfitSnapshot.contributorIds`). Leftover
rupees go one each to the first contributors, so the shares always add up. A contributor buying
from their own build gets nothing on that sale, and the others' shares do not grow. A person's
share is a row with `creatorId`; a brand owner's share is a row with `recipientBrandId`, paid
into the brand's balance. A CHECK constraint makes every row have exactly one recipient, and
partial unique indexes stop the same recipient being paid twice for one order item. Accounts
that are not active are left out of the split.

## Commission creation isn't deferred like stock is

`orders`' checkout creates `PENDING` commission rows at order-placement time regardless of
payment method, unlike stock (which `payments` defers to verification for eSewa/Khalti). Stock
is a scarce physical resource that must never be double-allocated; a commission is an accounting
record that can be voided if the sale falls through, which the lifecycle sweep does.

## No separate holding period between Approved and Available

The lifecycle is `PENDING → APPROVED → AVAILABLE → PAID/VOIDED`, but the sweep goes straight
from `PENDING` to `AVAILABLE` once the return window clears, stamping `approvedAt` and
`availableAt` together. Both timestamps stay in case a real holding period is added later.

## What voids a commission

The sweep voids `PENDING` rows on cancelled orders and failed payments. An admin cancel and an
admin "Returned / returned to origin" (`orders`) void every row that is not yet paid
(`voidForOrder`). Rows already `PAID` are left as they are and counted, so the return can flag a
manual clawback.
