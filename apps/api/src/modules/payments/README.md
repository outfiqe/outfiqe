# Payments — eSewa

## Stock decrement happens at verify, not at checkout

Unlike COD, eSewa/Khalti orders don't touch `ProductSize.stock` when the order is created (see `orders/README.md`) — only `settleVerified` does, inside the same atomic pattern as everywhere else: guard the settlement with a conditional `updateMany WHERE status = 'INITIATED'`, then decrement stock, all in one transaction. If the decrement fails (sold out in the gap between initiate and verify), the order is marked `paymentStatus: PAID, fulfilmentStatus: CANCELLED, needsManualRefund: true` — the payment can't be undone from our side, so it's flagged for a human to refund by hand rather than silently failing.

## The redirect is never trusted

`success_url` and `failure_url` point at the same callback URL. Verification never reads which URL eSewa used or trusts any query param it sends back — `POST /api/payments/:orderId/verify` always makes its own server-to-server call to eSewa's status endpoint using our own stored `transaction_uuid`, amount, and product code.

## Env var correction found by actually calling the sandbox

`ESEWA_STATUS_URL` was originally set to `uat.esewa.com.np`, sourced from developer docs during earlier research. That domain doesn't resolve at all (`ENOTFOUND`) — the real sandbox status host is `rc.esewa.com.np` (same host as the payment form). Found by making a live call, not by re-reading docs; verified end-to-end with a real (bogus) `transaction_uuid` against the live sandbox, which correctly returned `NOT_FOUND`.

## Reconciliation sweep, and the worker-swap seam

`runPaymentReconciliationSweep` (in `payment.reconciliation.ts`) is a plain async function with no knowledge of how it's triggered. It's registered with `shared/scheduling`'s `startIntervalScheduler`, which wraps it in a Redis mutex so multiple API instances don't double-process the same batch. Swapping to a real worker later means writing one new scheduler implementation that calls this same function — nothing in `payments` needs to change.

The sweep does two things on a schedule: re-verifies orders that have been `INITIATED` for 5–60 minutes (catches missed callbacks), and expires anything still `INITIATED` past 60 minutes (`paymentStatus: FAILED`) — with no stock to restore, since it was never decremented for these orders in the first place.

## Not yet verified

The "payment actually completes" path (`status: COMPLETE` from eSewa → `settleVerified` → stock decrement → `paymentStatus: PAID`) is proven at the unit/transaction level (same settlement pattern already verified for COD/idempotency in `orders`) and the live sandbox connectivity is proven, but going through an actual browser payment on eSewa's sandbox UI hasn't been done — that requires manual interaction, not something a script can do.
