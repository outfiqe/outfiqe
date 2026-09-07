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
  `checkout/README.md`). On an `ALREADY_SETTLED` error it invalidates `["orders"]` and
  `["payment-verify"]` — that response means the server settled the payment (the API re-verifies a
  prior attempt before starting a new one, see `apps/api/src/modules/payments/README.md`), so the
  order/callback views are stale and need to refetch. `isAlreadyPaidError` is exported so a caller
  can also show a "this already went through" message instead of a red error.
- `hooks/useVerifyPayment.ts` — polls `POST /payments/:orderId/verify` every 3s while the server
  says `PENDING`, up to 10 attempts, then exposes `hasTimedOut`.
- `components/PaymentCallbackScreen.tsx` — the callback page body. Takes `orderId` and an optional
  `gatewayReportedFailure` as props (the route pages under
  `app/payments/[provider]/callback/[orderId]/` supply them) and picks one of `PaymentSuccess` /
  `PaymentFailed` / `PaymentStillPending` / `PaymentPending` from the verify result.
- `api/paymentsApi.ts` / `paymentsSchemas.ts` — the two endpoints and their response shapes.

## Funnel

**User-facing**: after placing a wallet-payment order the shopper is sent straight to eSewa/Khalti.
On return they land on a "confirming your payment…" screen that resolves to received / didn't go
through (with a Try again button) / still confirming.

**Technical**: `CheckoutForm` → `useInitiatePayment` → `redirectToPaymentGateway` → gateway →
gateway redirects to `/payments/[provider]/callback/[orderId]` (or `/[orderId]/failed`) →
`PaymentCallbackScreen` → `useVerifyPayment` → `POST /payments/:orderId/verify` (see
`apps/api/src/modules/payments/README.md`).

## The gateway redirect is a UI hint, never the source of truth

`verify` is always what decides the order's real state — the callback screen never trusts the
gateway's redirect to mean a payment succeeded. But eSewa redirects a cancelled/failed payment to a
distinct `…/failed` route (the API builds `failure_url` that way — it can't use a query param
because eSewa mangles those, see `apps/api/src/modules/payments/README.md`), and the `failed` route
page passes `gatewayReportedFailure` so the screen jumps straight to the failed/retry view instead
of showing "confirming your payment…" and polling `verify` for ~30s before giving up. `verify`
still runs in the background the whole time, so a `COMPLETE` result always wins and corrects the
view if the gateway's redirect was wrong.
