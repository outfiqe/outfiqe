# Payments (web)

## Purpose

The wallet-payment (eSewa/Khalti) client half: hand the shopper off to the gateway after checkout,
then confirm the outcome when the gateway redirects them back.

## Structure

- `paymentRedirect.utils.ts` — `redirectToPaymentGateway`: takes the API's initiate result and
  either sets `window.location` (Khalti's `REDIRECT` mode) or auto-submits a hidden form
  (eSewa's `FORM_POST` mode).
- `hooks/useInitiatePayment.ts` — the `POST /payments/:orderId/initiate` mutation. `networkMode:
"always"` so an offline attempt fails fast instead of queueing invisibly (same reasoning as
  `checkout/README.md`).
- `hooks/useVerifyPayment.ts` — polls `POST /payments/:orderId/verify` every 3s while the server
  says `PENDING`, up to 10 attempts, then exposes `hasTimedOut`.
- `components/PaymentCallbackScreen.tsx` — the `/payments/[provider]/callback` page body. Picks
  one of `PaymentSuccess` / `PaymentFailed` / `PaymentStillPending` / `PaymentPending` /
  `MissingOrder` from the verify result and the redirect marker.
- `api/paymentsApi.ts` / `paymentsSchemas.ts` — the two endpoints and their response shapes.

## Funnel

**User-facing**: after placing a wallet-payment order the shopper is sent straight to eSewa/Khalti.
On return they land on a "confirming your payment…" screen that resolves to received / didn't go
through (with a Try again button) / still confirming.

**Technical**: `CheckoutForm` → `useInitiatePayment` → `redirectToPaymentGateway` → gateway →
gateway redirects to `/payments/[provider]/callback?orderId=…` → `PaymentCallbackScreen` →
`useVerifyPayment` → `POST /payments/:orderId/verify` (see `apps/api/src/modules/payments/README.md`).

## The gateway redirect is a UI hint, never the source of truth

`verify` is always what decides the order's real state — the callback screen never trusts a query
param the gateway sent to mean a payment succeeded. But eSewa redirects a cancelled/failed payment
to a distinct `failure_url` carrying `redirectOutcome=failed` (added by the API in
`payment.service.ts`), and the screen reads _that one marker_ to jump straight to the
failed/retry view instead of showing "confirming your payment…" and polling `verify` for ~30s
before giving up. `verify` still runs in the background the whole time, so a `COMPLETE` result
always wins and corrects the view if the gateway's redirect was wrong.
