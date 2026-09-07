# Payments — eSewa & Khalti

## Stock decrement happens at verify, not at checkout

Unlike COD, eSewa/Khalti orders don't touch `ProductSize.stock` when the order is created (see `orders/README.md`) — only `settleVerified` does, inside the same atomic pattern as everywhere else: guard the settlement with a conditional `updateMany WHERE status = 'INITIATED'`, then decrement stock, all in one transaction. If the decrement fails (sold out in the gap between initiate and verify), the order is marked `paymentStatus: PAID, fulfilmentStatus: CANCELLED, needsManualRefund: true` — the payment can't be undone from our side, so it's flagged for a human to refund by hand rather than silently failing.

## Gamification event (`PRODUCT_PURCHASED`)

`settleVerified` publishes it, but only in the successful branch (stock decremented cleanly, `markOrderPlaced` reached) — never when `needsManualRefund` gets set. Money moved either way in that failure case, but the sale is headed for a human refund decision, and this module has no XP-reversal mechanism, so it's safer to simply not award "purchase" XP there rather than award-then-need-to-claw-back. See `orders/README.md` for the COD half of this same event (COD publishes it from checkout instead, since there's no separate settlement step) and `xp/README.md` for what it triggers.

## The redirect is never trusted

`success_url` and `failure_url` both point at the same callback route, differing only by a
`&redirectOutcome=failed` marker on `failure_url`. Verification never reads that marker or any
query param eSewa sends back — `POST /api/payments/:orderId/verify` always makes its own
server-to-server call to eSewa's status endpoint using our own stored `transaction_uuid`, amount,
and product code. The marker exists purely so the web callback screen can show the failed/retry
state immediately instead of polling `verify` for ~30s first (see
`apps/web/src/features/payments/README.md`); it never influences the order's actual
`paymentStatus`, which still only moves on a verified status check or the reconciliation sweep.

## Env var correction found by actually calling the sandbox

`ESEWA_STATUS_URL` was originally set to `uat.esewa.com.np`, sourced from developer docs during earlier research. That domain doesn't resolve at all (`ENOTFOUND`) — the real sandbox status host is `rc.esewa.com.np` (same host as the payment form). Found by making a live call, not by re-reading docs; verified end-to-end with a real (bogus) `transaction_uuid` against the live sandbox, which correctly returned `NOT_FOUND`.

## eSewa `NOT_FOUND` becomes a failure after a grace window

eSewa's status endpoint returns `status: NOT_FOUND` both for a transaction it has genuinely never
seen (the shopper cancelled or abandoned the gateway) and, for a few seconds, for one that just
completed but hasn't propagated to the status service yet. `esewa.provider.verify` treats
`NOT_FOUND` as `PENDING` while the transaction is younger than
`NOT_FOUND_SETTLES_TO_FAILURE_AFTER_MS` (3 minutes from `PaymentTransaction.createdAt`, passed in as
`initiatedAt`), and as `FAILED` past that. Without this, a cancelled payment stays `PENDING` until
the 60-minute sweep expiry — the shopper watches a "confirming…" spinner that can never resolve.

Tradeoff: if eSewa ever took longer than 3 minutes to propagate a genuinely completed payment, we'd
mark that transaction `FAILED` and the order would never auto-settle (it'd need manual intervention,
same as any missed settlement). Propagation is a seconds-scale delay in practice, and 3 minutes is
well past eSewa's own "`NOT_FOUND` = being initiated" wording, so this is accepted rather than
guarded further here.

`AMBIGUOUS` is **never** mapped to a hard failure (it used to be, alongside `CANCELED`). eSewa
returns it transiently right after a successful payment while its status service catches up — and
its own meaning is "we can't tell, contact eSewa," not "it failed." Mapping it to `FAILED` meant a
shopper who had just paid was shown "Payment didn't go through" on the callback, then the
reconciliation sweep quietly settled the order minutes later. Now `AMBIGUOUS` is treated as
`PENDING` for as long as it lasts; the sweep re-checks for up to 60 minutes and settles on a
`COMPLETE`, and its 60-minute expiry is the terminal backstop if eSewa never resolves it. Only
`CANCELED` (and `NOT_FOUND` past the 3-minute grace) is a provider-level `FAILED`.

## Every eSewa attempt gets a fresh `transaction_uuid`

eSewa rejects a `transaction_uuid` it has already seen with `{"error_message":"Duplicate
transaction UUID."}` — including one the shopper started and then cancelled. So a single
`PaymentTransaction` can't reuse one id across retries: `esewaProvider.initiate` generates a new
`crypto.randomUUID()` for every call, signs the form with it, and returns it as `providerRef`;
`payment.service` stores it on `transactionRef`, and `esewaProvider.verify` does its status lookup
by `providerRef ?? transactionUuid`. The reused-id scheme worked only because nobody had retried a
cancelled payment yet.

`paymentService.initiate` retires the previous attempt before starting a new one: if a pending
`PaymentTransaction` already has a `transactionRef` (so it was handed to the gateway once), it
first runs a full `runVerify` on it — a shopper who actually completed that attempt in another tab
gets `ALREADY_SETTLED` and is **not** sent to pay again — then marks it `FAILED` so
`getOrCreatePendingTransaction` starts a clean row. Each attempt keeps its own `transactionRef` for
ops to trace a manual refund against.

**Known limitation:** two `initiate` calls that overlap on the server (the retry buttons disable
on `isPending`, so this needs a same-frame double-fire that a human touch can't really produce, but
a synthetic event or a render loop could) can create two fresh attempts. `verify` and the sweep
only ever check the newest pending transaction, so if the shopper then completes the _older_ one,
the order would expire to `FAILED` with money taken. A DB-level "one pending PAYMENT transaction
per order" partial-unique constraint would close it fully and is the right follow-up if this is
ever observed.

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

Both providers now hand us a reference at initiate time that isn't `PaymentTransaction.id`: Khalti
generates its own `pidx`, and eSewa's provider generates a fresh `transaction_uuid` per attempt (see
the next section). It also returns a _third_, separate `transaction_id` once a Khalti payment
settles (from the lookup response). Concretely:

- `PaymentTransaction.id` — our own id, always.
- `PaymentTransaction.transactionRef` — the reference the gateway interaction actually uses,
  captured at initiate (`PaymentInitiateResult.providerRef`) via `setTransactionRef`. For eSewa it's
  the per-attempt `transaction_uuid` the form was signed with; for Khalti it's the real `pidx`. Both
  the eSewa status lookup and the Khalti lookup key off this field, not `PaymentTransaction.id`.
  **This field used to get overwritten with our own id again at settlement** (`settleTransaction`
  used to set `transactionRef: transactionId`) — harmless when eSewa's ref was our id, but would
  have silently destroyed Khalti's real `pidx` the moment a payment settled. Fixed: `settleTransaction`
  no longer touches `transactionRef` at all.
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
