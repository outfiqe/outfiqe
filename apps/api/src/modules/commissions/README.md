# Commissions

## The `/me` read endpoints are creator-only

`GET /commissions/me` and `/me/summary` call `requireApprovedCreator`
(`#lib/creator-guard.utils.js`) before touching the repository, so a signed-in shopper who isn't
an approved creator gets `403 NOT_A_CREATOR` rather than an all-zero summary. Commission _rows_
are still created speculatively for any buyer's order (see below) — the gate is on reading an
earnings view, which only means anything for a creator. The admin `/commissions/*` endpoints
keep their own `requirePlatformAccess` gate and are untouched.

## Commission creation isn't deferred like stock is

`orders`' checkout creates a `PENDING` `CreatorCommission` at order-placement time regardless of payment method, unlike stock (which `payments` defers to verification for eSewa/Khalti — see that module's README). This is intentional, not an inconsistency: stock is a scarce physical resource that must never be double-allocated, so it can't be claimed speculatively. A commission is just an accounting record — it's fine to create it speculatively and void it later if the sale falls through. That's what this module's lifecycle sweep is for: a `PENDING` commission attached to an order whose payment ultimately fails or expires (chunk 8's reconciliation sweep marking it `FAILED`) gets voided here, not left dangling.

## No separate holding period between Approved and Available

The lifecycle is `PENDING → APPROVED → AVAILABLE → PAID/VOIDED`, but no "additional holding period" between Approved and Available was ever defined, so the sweep collapses them into one transition — a commission goes straight from `PENDING` to `AVAILABLE` (with both `approvedAt` and `availableAt` stamped the same instant) once the return window clears. The schema still keeps both timestamps distinct in case a real holding period gets added later.

## Depends on data nothing produces yet

Approval depends on `Order.deliveredAt` being set, which needs `fulfilmentStatus` to reach `DELIVERED` — nothing does that yet (no brand/admin order-fulfilment UI exists until later chunks). Verified by manually setting `deliveredAt`/`fulfilmentStatus` directly in a test script, the same way chunk 5 verified attribution before the creator-links module existed to actually generate link clicks. The sweep query itself is correct and ready; it just won't find real matches until that producing side is built.

## Void only targets PENDING, not APPROVED/AVAILABLE

Matches the literal PRD wording ("cancelled, refunded, or fraud-flagged orders never reach Approved") — a very late refund on an already-approved commission isn't handled by this sweep. Known, accepted gap, not silently missed.
