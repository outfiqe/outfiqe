# Outfit offers

## Purpose

A brand on a locked Outfit Build sends it to a creator on the same build as an offer: "post this
outfit for Rs 5,000". The brand pays with eSewa or Khalti when sending; Outfiqe holds the money.
The creator accepts or declines before a deadline, then posts a Creator Look from the build before
a second deadline. Once the look has stayed up for a holding period, the money becomes the
creator's earnings and can be withdrawn. In every other ending the brand is refunded.

## Structure

- `outfit-offer.routes.ts` — everything under `/api/outfit-offers`:
  - brand: `POST /builds/:id` (send, needs an idempotency key), `POST /:offerId/payment` (pay
    again), `POST /:offerId/payment/verify`, `POST /:offerId/cancel`, `GET /sent`;
  - creator: `GET /received`, `POST /:offerId/accept`, `POST /:offerId/decline`;
  - both: `GET /builds/:id` (offers on a build the viewer is on), `GET /:offerId`;
  - admin: `GET /admin`, `POST /admin/:offerId/release|refund|mark-refunded` (Finance:
    `platform:commissions:read` / `:manage`).
- `outfit-offer.controller.ts` — reads input and the signed-in person, calls the service.
- `outfit-offer.service.ts` — `outfitOfferService`, the only object the controller and other
  modules import: reading one offer and the sent/received/per-build lists, with the topic services
  below spread in.
- `sending/sending.service.ts` — a brand sends an offer, retries its payment, and confirms it
  (`send`, `retryPayment`, `verifyPayment`).
- `responses/response.service.ts` — the creator accepts or declines, the brand cancels, and the
  hook `recordPostedLook` that `outfits/outfit-publish.service.ts` calls when a look is posted.
- `admin/admin.service.ts` — the admin dispute list and the release, refund and mark-refunded
  actions.
- `outfit-offer.guards.ts` — which side of an offer the viewer is on, and the brand/creator-side
  checks every action uses.
- `outfit-offer.settlement.ts` — the refund flow (`refundOffer`, `closeWithRefund`, the manual-refund
  alert) and `releaseToCreator`, shared by responses and admin.
- `outfit-offer.views.ts` — reloading an offer as the viewer sees it, and paging offer lists.
- `outfit-offer.payments.ts` — starts, checks and refunds a payment through the existing eSewa
  and Khalti providers (`../payments/providers`).
- `outfit-offer.lifecycle.ts` — the sweep wired in `src/jobs/scheduled-jobs.ts`.
- `outfit-offer.notifications.ts` — offer notices go through the outbox (`outfit-offer.notice`
  topic, notify queue) and become `OUTFIT_OFFER_*` notifications.
- `outfit-offer.repository.ts`, `outfit-offer.utils.ts`, `outfit-offer.constants.ts`,
  `outfit-offer.errors.ts`, `outfit-offer.schemas.ts`, `outfit-offer.types.ts`.

## Funnel

**User-facing.** A brand owner on a locked build opens "Send an offer", picks a creator on the
build, enters an amount and a message, and pays. The creator gets a notification and sees the
offer on the build and under Offers, with the date to answer by. Accepting starts the posting
deadline; the creator then uses "Drop as a look" on the build. After the holding period the
amount shows up in the creator's earnings. Declining, cancelling, missing a deadline or deleting
the look early refunds the brand.

**Technical.** `POST /builds/:id` → service checks the sender is a brand owner on the build, the
build is locked, the creator is an approved creator on the build, the amount is inside the admin
range, and the message passes the content check → one transaction creates the offer
(`PAYMENT_PENDING`) and a payment row → the provider is started outside the transaction → the
browser goes to the gateway and comes back to `/offers/payment/<provider>/callback/<offerId>`,
which calls `verify` → a completed payment moves the offer to `AWAITING_RESPONSE` and queues the
"offer received" notice in the same transaction.

## Statuses

| Status                                             | Meaning                                              | Money                 |
| -------------------------------------------------- | ---------------------------------------------------- | --------------------- |
| `PAYMENT_PENDING`                                  | Created, waiting for the brand's payment             | Not taken yet         |
| `PAYMENT_FAILED`                                   | Payment never completed (gave up after an hour)      | Not taken             |
| `AWAITING_RESPONSE`                                | Paid, waiting for the creator (until `acceptBy`)     | Held                  |
| `ACCEPTED`                                         | Creator agreed, must post the look (until `postBy`)  | Held                  |
| `POSTED`                                           | Look is up, waiting out the hold (until `releaseAt`) | Held                  |
| `RELEASED`                                         | Paid to the creator's earnings (`payoutStatus`)      | Creator's balance     |
| `DECLINED`, `CANCELLED`, `EXPIRED`, `LOOK_REMOVED` | Closed early                                         | Refunded to the brand |

`refundStatus` tracks the money for closed offers: `PENDING` while the refund runs, then
`REFUNDED`, or `NEEDS_MANUAL_REFUND` for eSewa (no refund API) or a failed Khalti refund; ops get
an email and an admin marks it refunded after paying by hand. `payoutStatus` goes `AVAILABLE`
when released and `PAID` when a withdrawal claims it.

## Non-obvious rationale

- **Every status change is a conditional update guarded by the status it leaves.** Two clicks,
  or a click racing the sweep, can't both win; the loser gets `409`.
- **One open offer per creator per build** is a partial unique index, not a read-then-write
  check.
- **The look must come from the offered version.** The offer remembers the build version it was
  sent for; posting a look from that version is what moves it to `POSTED`. If the owner changes
  and relocks the build, the old offer can't be fulfilled and expires, refunding the brand.
- **Refunds run outside the database transaction.** The status change and `refundStatus:
PENDING` commit first, so a crash mid-refund leaves the offer visibly waiting; the sweep retries
  `PENDING` refunds. A refund only ever happens after the guarded status change has won.
- **Released offers are their own ledger rows**, not commission rows: a commission row belongs to
  an order item and a tier, an offer has neither. The withdraw claim for a person picks available
  commission and released offers together, oldest first (`LedgerEntryKind.OFFER_PAYOUT`).
- **No platform fee** is taken on offers.
- Deadlines and limits are admin settings: `outfit.offerAcceptWithinDays`,
  `outfit.offerPostWithinDays`, `outfit.offerHoldDays`, `outfit.offerMinAmount`,
  `outfit.offerMaxAmount`.
