# Payments — eSewa & Khalti

## Stock decrement happens at verify, not at checkout

Unlike COD, eSewa/Khalti orders don't touch `ProductSize.stock` when the order is created (see `orders/README.md`) — only `settleVerified` does, inside the same atomic pattern as everywhere else: guard the settlement with a conditional `updateMany WHERE status = 'INITIATED'`, then decrement stock, all in one transaction. If the decrement fails (sold out in the gap between initiate and verify), the order is marked `paymentStatus: PAID, fulfilmentStatus: CANCELLED, needsManualRefund: true` — the payment can't be undone from our side, so it's flagged for a human to refund by hand rather than silently failing.

## Gamification event (`PRODUCT_PURCHASED`)

`settleVerified` publishes it, but only in the successful branch (stock decremented cleanly, `markOrderPlaced` reached) — never when `needsManualRefund` gets set. Money moved either way in that failure case, but the sale is headed for a human refund decision, and this module has no XP-reversal mechanism, so it's safer to simply not award "purchase" XP there rather than award-then-need-to-claw-back. See `orders/README.md` for the COD half of this same event (COD publishes it from checkout instead, since there's no separate settlement step) and `xp/README.md` for what it triggers.

## The redirect is never trusted

`success_url` and `failure_url` point at the same callback URL. Verification never reads which URL eSewa used or trusts any query param it sends back — `POST /api/payments/:orderId/verify` always makes its own server-to-server call to eSewa's status endpoint using our own stored `transaction_uuid`, amount, and product code.

## Env var correction found by actually calling the sandbox

`ESEWA_STATUS_URL` was originally set to `uat.esewa.com.np`, sourced from developer docs during earlier research. That domain doesn't resolve at all (`ENOTFOUND`) — the real sandbox status host is `rc.esewa.com.np` (same host as the payment form). Found by making a live call, not by re-reading docs; verified end-to-end with a real (bogus) `transaction_uuid` against the live sandbox, which correctly returned `NOT_FOUND`.

## Reconciliation sweep, and the worker-swap seam

`runPaymentReconciliationSweep` (in `payment.reconciliation.ts`) is a plain async function with no knowledge of how it's triggered. It's registered with `shared/scheduling`'s `startIntervalScheduler`, which wraps it in a Redis mutex so multiple API instances don't double-process the same batch. Swapping to a real worker later means writing one new scheduler implementation that calls this same function — nothing in `payments` needs to change.

The sweep does two things on a schedule: re-verifies orders that have been `INITIATED` for 5–60 minutes (catches missed callbacks), and expires anything still `INITIATED` past 60 minutes (`paymentStatus: FAILED`) — with no stock to restore, since it was never decremented for these orders in the first place.

## Not yet verified

The "payment actually completes" path (`status: COMPLETE` from eSewa → `settleVerified` → stock decrement → `paymentStatus: PAID`) is proven at the unit/transaction level (same settlement pattern already verified for COD/idempotency in `orders`) and the live sandbox connectivity is proven, but going through an actual browser payment on eSewa's sandbox UI hasn't been done — that requires manual interaction, not something a script can do.

## Khalti (chunk 14)

`providers/khalti.provider.ts` implements the same `PaymentProvider` interface against Khalti's
ePayment v2 API (`dev.khalti.com/api/v2/` in sandbox — production later needs its own
`KHALTI_SECRET_KEY`/`KHALTI_BASE_URL`, same pattern as eSewa). Registered in `payment.service.ts`'s
`providers` map alongside eSewa — `initiate`/`verify` work identically for either method from the
caller's side.

### Three different identifiers, one field

Unlike eSewa (whose `transaction_uuid` is entirely our own value, used for both initiate and
status lookup), Khalti generates its own `pidx` at initiate time that we don't control, and
returns a _third_, separate `transaction_id` once the payment settles (from the lookup response).
Concretely:

- `PaymentTransaction.id` — our own id, always.
- `PaymentTransaction.transactionRef` — the provider's own reference, captured once at initiate
  (`PaymentInitiateResult.providerRef`) via the new `setTransactionRef`. For eSewa this is just
  its own `transaction_uuid` (= our id) again; for Khalti it's the real `pidx`. **This field used to
  get overwritten with our own id again at settlement** (`settleTransaction` used to set
  `transactionRef: transactionId`) — harmless no-op for eSewa, but would have silently destroyed
  Khalti's real `pidx` the moment a payment settled. Fixed: `settleTransaction` no longer touches
  `transactionRef` at all.
- Khalti's settlement-time `transaction_id` (from the lookup response body) is **not** given its
  own column — it's already captured for free inside `rawResponse` (stored on settle, same as every
  other provider), since nothing needs it until a refund is triggered.

### What chunk 15 needs to call `khaltiProvider.refund()`

`refund({ gatewayTransactionId, payerPhone })` — `gatewayTransactionId` is Khalti's own
`transaction_id`, pulled from the settled `PaymentTransaction.rawResponse.transaction_id`, **not**
`transactionRef` (that's the `pidx`, a different id, per Khalti's refund docs which explicitly key
off the lookup-returned `transaction_id`). `payerPhone` is `Order.phone` (already collected at
checkout — no new data to gather).

**Built in chunk 15**: `paymentService.refund(orderId, paymentMethod, payerPhone)` does exactly
this extraction (via the new exported `extractKhaltiTransactionId`) and resolves the right
provider, so callers (`orders`' admin cancel action) never need to know which providers support
automated refunds at all — a provider with no `refund` method just gets treated as "record it
manually," and a missing/malformed `gatewayTransactionId` fails safely (`succeeded: false`) instead
of throwing.

### Unverified assumptions (no real Khalti sandbox account exists yet)

Khalti's sandbox requires signing up at `test-admin.khalti.com` (OTP-gated) for a real secret key —
there's no universal public test credential like eSewa's `EPAYTEST`. Without one, live verification
stopped at "the request reaches the right host/path and gets rejected for auth" (a real `401
Invalid token` from all three endpoints — `epayment/initiate/`, `epayment/lookup/`, and
`merchant-transaction/:id/refund/` — confirms the URLs/methods are correct, not just that the host
resolves). Two things remain unverified against a real transaction:

1. The actual "browser completes a Khalti payment → lookup returns `Completed`" path — same category
   of gap as eSewa's own browser-payment leg.
2. **`refund`'s request body.** Khalti's docs describe different required fields for wallet vs. bank
   transactions (`mobile` required for bank, not required for wallet), and there's no way for us to
   know which one a given transaction used. This implementation always sends `mobile` on a full
   refund, on the assumption that Khalti's API ignores extra unrecognized fields on a wallet refund
   rather than rejecting them — reasonable but genuinely untested. Verify with a real refund before
   trusting this in production.

### Also fixed while here

`payment.service.ts`'s callback URL was hardcoded to `/payments/esewa/callback` regardless of which
provider actually initiated — harmless while eSewa was the only registered provider, wrong the
moment Khalti became a second one. Now built from `paymentMethod.toLowerCase()`.

### Known gap, not in this chunk's scope

Neither eSewa nor Khalti is actually reachable from the checkout UI yet — `PAYMENT_METHODS` in
`apps/web/src/features/checkout/checkout.constants.ts` still has both `enabled: false`, and no
`/payments/:provider/callback` page exists in `apps/web` to land on after a redirect. This was true
before this chunk too (eSewa's own chunk 8 was backend-only); flagging it explicitly now that a
second provider is fully built server-side with nothing in the UI able to reach either of them.
