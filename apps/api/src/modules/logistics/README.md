# logistics

## Purpose

Outfiqe-run delivery. Brands press "Ready for pickup". An Outfiqe rider collects the items with
a scan. The Outfiqe hub checks them and combines each order into one parcel. Any delivery partner
takes the parcel to the customer. Every step is a recorded tracking event. The full behaviour is in
`docs/PRD-ORDER-LOGISTICS.md`.

The whole flow sits behind the `order_logistics` feature flag. Orders keep today's brand-shipped
flow (`FulfilmentMode.BRAND_SHIPS`) until the flag is on for their brand.

## Structure

- `logistics.journeys.integration.test.ts` — the whole flow through the real endpoints, from a
  brand pressing "Ready for pickup" to the customer. It covers:
  - three brands in one cash parcel, delivered by spreadsheet, with the cash and rider pay
    settled;
  - a late brand sent in a second parcel;
  - a mixed hub and brand-shipped order;
  - a refusal coming back, refunded and restocked;
  - a lost parcel;
  - a coupon order with a unit that fails inspection;
  - a connected partner, booked by API and delivered by signed webhook.

  Its steps live in `src/testing/integration/logistics-journey.ts`, one helper per real request.

- `logistics.service.ts` — `logisticsService`, the only object other modules import. It
  spreads in every topic service.
- `logistics.repository.ts` — `logisticsRepository`, spreading in every topic repository.
- `logistics.routes.ts` — mounted at `/api/logistics`:
  - `/admin/hubs` → `hubs/`, `/admin/riders` → `riders/`, `/admin/bag-tag-batches` → `bag-tags/`;
  - `/admin/pickup-board` and `/admin/rider-tasks` → `rounds/` (staff);
  - `/brand/pickup-locations` → `pickup-locations/`, `/brand/pickups` → `pickups/`;
  - `/rider/tasks` → `rounds/` (riders);
  - `/orders/:orderId` → `customer-tracking/` (the buyer);
  - `/admin/partners` → `partners/`, `/admin/partners/:partnerId/webhook-receipts` →
    `partner-webhooks/`;
  - `/hub` → `hub-operations/` and `shipments/` (hub staff).
- `app.ts` also mounts `partner-webhooks/`'s receiver at `/api/webhooks/delivery-partners`, before
  `express.json()` (see the rationale below).
- `logistics.outbox.ts` — `registerLogisticsOutboxHandlers`, called from `processes/consumers.ts`:
  partner updates received and partner bookings requested, both on the `outbox-logistics` queue.
- `logistics.jobs.ts` — the partner polling, stuck-booking and receipt clean-up jobs that
  `src/jobs/scheduled-jobs.ts` runs.
- `logistics.partner-adapters.ts` — `logisticsPartnerAdapters.forAccount(partner, account)`, the
  adapter for one of our merchant accounts with a partner.
- `logistics.rate-limits.ts` — the per-user limiters shared by every topic's routes: staff writes,
  brand writes, rider scans and hub scans (check-in and handover, 120 a minute).
- `logistics.constants.ts` — pickup statuses that mean a bag is no longer on its way to the hub
  (packing and the "orders to pack" list), and parcel statuses that mean the partner has it (the
  "with partner" queue and polling).
- `logistics.partner-events.ts` — `logisticsPartnerEvents.applyPartnerTrackingEvent`, the one
  place a partner's update becomes a tracking event. Spreadsheet imports, webhooks and polling all
  use it. It matches the update to a booking (the partner's parcel number first,
  then our parcel code with any `-2` rebook suffix removed), maps their status word through the
  status map, and records the event with a dedupe key built from the booking, status and time.
- `logistics.guards.ts` — `requireActiveRider(userId)`: loads the signed-in rider's profile, or
  answers `403` when there is none or it isn't `ACTIVE`.
- `logistics.pickup-coverage.ts` — `logisticsPickupCoverage`, shared by `pickup-locations/` and
  `flow/`:
  - which active hub collects from a pickup city (a city in a delivery zone listed in a hub's
    `HubPickupZone`s);
  - the brands' default pickup locations.
- `hubs/` — admin-managed hubs.
  - Endpoints: `GET /`, `POST /`, `PUT /:hubId`, `PUT /:hubId/pickup-zones`.
  - Guarded by `platformGuards.logisticsRead` / `logisticsManage`.
  - The schema checks that the hub opens before it closes, and that every pickup round and the
    partner collection time fall within opening hours.
  - The hub phone is stored in international form.
  - Pickup areas must be delivery zones in the hub's own country.
- `pickup-locations/` — a brand's pickup addresses.
  - Endpoints: `GET /`, `POST /`, `PUT /:locationId`, `POST /:locationId/default`,
    `DELETE /:locationId`, for `BRAND_OWNER`s only and scoped to their brand. Another brand's
    location is a `404`.
  - At most 10 per brand. The first one becomes the default.
  - Removing the default promotes the oldest remaining location. Removal deactivates the row,
    because fulfilment groups keep pointing at the location they were collected from.
  - Each location says whether an Outfiqe hub collects from its city
    (`isCoveredByOutfiqePickup`).
- `pickups/` — the brand's "Ready for pickup" (`POST /brand/pickups/:fulfilmentGroupId/ready`, `BRAND_OWNER` only, scoped to their brand, brand write-limited). It only applies to the brand's hub-flow groups; anything else is a `404`.
  - It records a `READY_FOR_PICKUP` tracking event with a fixed dedupe key per group, so pressing it twice changes nothing.
  - Once a rider has collected the items, it answers `409 PICKUP_ALREADY_MOVED_ON`.
  - It returns the pickup code the rider scans.
- `riders/` — admin rider management (`platformGuards.logisticsRead` / `logisticsManage`, staff
  write-limited).
  - Endpoints: `GET /` (by hub and status, cursor-paged), `GET /invites`, `POST /invites`,
    `POST /:riderId/identity-check`, `PATCH /:riderId/status`, `PATCH /:riderId/vehicle`.
  - An invite stores only a token hash and expires in 7 days. The email links to
    `/register/rider?token=…` on the web app. Sign-up itself lives in
    `auth/invites/rider-invite.service.ts` (`POST /auth/register/rider`, `GET /auth/invite/rider`).
  - A new employee starts `ACTIVE`; a new contractor starts `PENDING_VERIFICATION` and can't be
    activated (`409 RIDER_IDENTITY_NOT_CHECKED`) until staff record an in-person ID check.
  - Suspending or offboarding cancels the rider's open visits (their unscanned bags go back on the
    board) and deletes every refresh token, in one transaction.
  - Invites, ID checks and status changes are written to the platform audit log.
- `alerts/` — time-limit and event alerts (PRD §14.2).
  - `alert.rules.ts` — one rule per time limit, listed in `TIME_LIMIT_ALERT_RULES`: brand not ready
    (then escalated), missed round, waiting at the hub, partner hasn't collected, no partner update,
    COD remittance overdue, promise at risk and promise missed. Limits are in
    `LOGISTICS_TIME_LIMITS` (`logistics.constants.ts`).
  - `alert-candidates.repository.ts` — the database side of each rule: oldest first, in batches,
    skipping subjects that already have an alert of that type.
  - `alert-deadlines.utils.ts` — working days at the hub, the next partner collection, and dates in
    the country's time zone.
  - `alert.repository.ts` — `logisticsAlertRepository`: inserting alerts (duplicates skipped),
    claiming notifications, closing alerts whose subject moved on, and the admin list.
  - `alert.notifications.ts` — who hears about each alert.
  - `alert.service.ts` — `runLogisticsAlertSweep` (the 10-minute `logistics-alerts` job), the list
    and resolving with a note.
  - Endpoints: `GET /admin/alerts?status=OPEN|RESOLVED&alertType=` (`logisticsRead`, with open
    counts by type) and `POST /admin/alerts/:alertId/resolve` (`logisticsManage`, a note,
    staff write-limited).
- `bag-tags/` — sticker batches (`GET /`, `POST /`, `GET /:batchId`). A batch belongs to one open
  hub and holds 1–500 random 10-character codes (unique; collisions are re-drawn). A sticker is
  "used" once it is attached to a pickup, and can only ever be attached once.
- `rounds/` — pickup rounds:
  - Staff (`rounds.routes.ts`, `rounds.service.ts`):
    - `GET /admin/pickup-board?hubId=` — pickup locations with bags marked ready and not yet on an
      active visit, or with brand returns waiting at the hub to go back there, cursor-paged by
      location. Each location lists its `pickups` and its `returns`.
    - `POST /admin/rider-tasks` — one visit: one active rider at the rider's hub, one pickup
      location, and 1–50 stops: waiting bags to collect (`fulfilmentGroupIds`) and brand returns
      to hand back (`brandReturnIds`). Records `RIDER_ASSIGNED` per bag and moves each return
      `AT_HUB` → `ON_ROUND`, refusing the whole visit if any of them moved meanwhile.
    - `GET /admin/rider-tasks?hubId=` and `POST /admin/rider-tasks/:taskId/cancel` (only before
      anything is collected).
  - Riders (`rider-task.routes.ts`, `rider-task.service.ts`, `RIDER` role, `ACTIVE` profile, scan
    rate limit):
    - `GET /rider/tasks`, `GET /rider/tasks/:taskId` — their open visits, with the pickup address,
      contact and bags.
    - `POST /rider/tasks/:taskId/collect-scans` — pickup code + sticker code + phone scan time,
      with a required `Idempotency-Key`. See the funnel below.
    - `POST /rider/tasks/:taskId/return-drop-offs` — `{ brandReturnId }`: the rider handed a
      return to the brand. Marks the stop scanned and the return `DROPPED_OFF`; for a returned
      parcel it records `RETURNING_TO_BRAND` on the bag. A repeat is answered without changing
      anything.
    - `POST /rider/tasks/:taskId/wasted` (nothing done, with a reason; records `VISIT_WASTED`
      and a brand incident) and `POST /rider/tasks/:taskId/finish` (something done; the rest go
      back on the board). Releasing a visit (wasted, finished early or cancelled by staff) puts
      every return it hadn't handed over back `AT_HUB`.
- `flow/` — `resolveFulfilmentAssignments({ brandIds, deliveryCity, countryCode,
requiresCashOnDelivery })`, which checkout calls before its transaction to decide each brand's
  flow.
  - A brand goes through the hub (`OUTFIQE_LOGISTICS`, with its hub and pickup location) when:
    - the `order_logistics` flag is on for it (`EVERYONE`, or the brand is on the allow-list);
    - its default pickup location is in an active hub's pickup area;
    - an active delivery partner with an active account at that hub delivers to the customer's
      delivery zone (and collects cash, when the order is cash on delivery).
  - Otherwise it stays `BRAND_SHIPS`.
- `partners/` — delivery partners (`platformGuards.logisticsRead` / `logisticsManage`).
  - Endpoints: `GET /`, `POST /`, `GET /:partnerId`, `PUT /:partnerId`,
    `PUT /:partnerId/accounts/:hubId`, `PUT /:partnerId/zones` (replaces one hub's areas),
    `PUT /:partnerId/status-map`, `POST /:partnerId/status-imports`,
    `GET /:partnerId/status-imports/:importId`.
  - `GET /:partnerId` also returns the `webhookUrl` to paste into the partner's dashboard, and for
    each account which secrets are set in the environment (never the secrets themselves).
  - `adapters/` — `partner-adapter.types.ts` (the contract every partner connection implements),
    `manual.adapter.ts` (no API calls; staff book by hand), `http-json.adapter.ts` and
    `partner-adapter.registry.ts` (adapter by `adapterKey`, plus what each one supports). A
    partner's "supports booking / webhooks / polling" flags come from its adapter, never from the
    request.
  - `http-json.adapter.ts` (`HTTP_JSON`) — the reference API connection, contract-tested against
    the recorded replies in `fixtures/http-json/`. Bearer API key, 10-second timeout, every reply
    checked with zod. Webhooks are verified by an HMAC-SHA256 hex signature of the raw body in
    `x-partner-signature`, or the shared secret in `x-partner-token`, with the current or previous
    secret. A real partner gets its own adapter file and registry entry once they give us API
    access.
  - `partner-request.error.ts` — `PartnerRequestError(message, isRetryable)`: timeouts and `5xx`
    are worth retrying; `4xx`, missing secrets and replies in the wrong shape are not.
  - Secrets live in the environment, named by the account's `credentialsKey`
    (`#config/delivery-partner.config.ts`): `DELIVERY_PARTNER_<KEY>_API_KEY`, `_BASE_URL`,
    `_WEBHOOK_SECRET` and `_WEBHOOK_SECRET_PREVIOUS` (for rotation). A value that is missing or too
    short counts as not set.
  - `partner-status.utils.ts` — status word and reference normalising, the rebook reference
    (`OFQ…-2`), the dedupe key, and the parcel-number pattern check. The pattern must match the
    whole number, so `partner.schemas.ts` refuses a pattern with no part that changes (`SANSAR-`
    would only ever accept "SANSAR-"), and a typed number that doesn't fit answers
    `PARTNER_REFERENCE_INVALID` with the pattern it should look like.
  - `partner-status-import.*` — the CSV status sheet. `#lib/csv.utils.ts` parses it; the first row
    names the columns (the usual spellings are recognised); up to 500 rows; times without a zone
    are read in the time zone of the partner's hub. Every row is reported back as applied, saved
    with no change, already recorded, no matching parcel, unknown status or a bad row.
- `hub-operations/` — what hub staff do with bags and parcels (`logisticsManage` for writes).
  - `check-in.service.ts` — `POST /hub/check-ins` (`Idempotency-Key`): a bag sticker or pickup code
    plus the units counted. Moves the pickup to `AT_HUB`; a wrong count also records
    `COUNT_MISMATCH`.
  - `inspection.service.ts` — `POST /hub/pickups/:groupId/inspection`: a result for every item.
    Failed units are refunded through `orderService.refundOrderItems` (cause
    `HUB_INSPECTION_FAILED`, one idempotency key per pickup) before the inspection is saved.
  - `packing.service.ts` — `POST /hub/orders/:orderId/parcels`: packs every bag of the order at the
    hub into one parcel (`OFQ` + 8 characters). Refused with `409 PICKUPS_NOT_INSPECTED` while any
    bag at the hub hasn't been inspected (`packsOnlyPickupsAtHub` doesn't skip this), and while
    bags are still coming unless `packsOnlyPickupsAtHub` is set. A bag whose every unit failed
    inspection is left out: its items go back to the brand, not to the customer. The same rules
    are part of the guarded update that attaches bags to the parcel
    (`PICKUP_READY_TO_PACK_WHERE` in `logistics.query-helpers.ts`), so a bag that changes while
    staff pack can't slip in. Creates a `REQUESTED` booking with the first eligible partner
    (`parcel-partner.ts`: lowest priority number for the hub and the customer's zone, cash-capable
    for COD). For an API partner the booking is queued for `partner-bookings/` in the same
    transaction.
  - `parcel-cash.ts` — the cash a parcel collects: its bags' remaining goods (from
    `orderService.calculateCashToCollect`), plus the order's delivery and COD fees on the order's
    first parcel; zero unless the order is unpaid cash on delivery.
  - `parcel-booking.service.ts` — `POST /hub/shipments/:shipmentId/booking` (the partner's parcel
    number, checked against their pattern and unique per partner; refused with
    `409 BOOKING_IN_PROGRESS` while an API booking is still being made),
    `POST /hub/shipments/:shipmentId/booking/retry` (a failed API booking, see `partner-bookings/`)
    and `POST /hub/shipments/:shipmentId/rebook` (cancels the live booking, books another partner,
    queued the same way as packing).
  - `handover.service.ts` — `GET /hub/shipments/:shipmentId/label`,
    `POST /hub/shipments/:shipmentId/label-printed`, and `POST /hub/handovers`
    (`Idempotency-Key`): refused unless the parcel is booked (`PARCEL_NOT_BOOKED`), its label has
    been printed (`LABEL_NOT_PRINTED`) and the printed label shows the current cash to collect
    (`LABEL_OUT_OF_DATE`). Each refusal names the step to do first.
- `logistics.query-helpers.ts` — Prisma conditions packing and the packing list share: an item
  with units left for the customer, an item not inspected yet, a bag waiting to be packed (at the
  hub, not in a parcel, with units left) and a bag ready to pack (also fully inspected).
- `shipments/` — the hub's parcel queues: `GET /hub/orders-to-pack` (orders with a bag waiting to
  be packed; a bag emptied by inspection is in neither of its lists), `GET /hub/shipments?queue=`
  (`TO_BOOK`, `TO_HAND_OVER`, `WITH_PARTNER`, `FINISHED`), `GET /hub/shipments/:shipmentId`
  (contents, booking and the event timeline), and `POST /hub/shipments/:shipmentId/events` (a
  status a partner gave by phone; corrections can leave a final status and are audit-logged).
  `shipment-booking.repository.ts` holds the booking reads and writes the hub and partner updates
  share; `shipment.utils.ts` `toParcelBookingSummary` is the one booking shape every answer uses
  (status, connection, both references, the partner's tracking link and any failure reason).
- `partner-bookings/` — booking parcels with API partners.
  - `partner-booking.service.ts` — `logisticsPartnerBookingService`:
    - `queueApiBooking(tx, booking)` — queues `logistics.partner-booking-requested` for an API
      booking (manual ones are left for staff).
    - `processBookingRequest(bookingId)` — the outbox handler. Claims an attempt, then asks the
      partner, looking the parcel up first if it was tried before, and records `BOOKING_CONFIRMED`.
      A retryable failure is thrown so the outbox tries again; the fifth try, or a failure that
      isn't worth retrying, marks the booking `BOOKING_FAILED` and records `BOOKING_FAILED`.
    - `retryFailedBooking(staffUserId, shipmentId)` — puts a failed booking back to `REQUESTED`
      with a fresh attempt count and queues it again.
    - `sweepStuckBookings()` — every 10 minutes, marks an API booking that has waited more than 30
      minutes without an attempt as failed, so staff see it.
  - `partner-booking.utils.ts` — the request sent to the partner (our hub as the pickup, the
    buyer as the recipient, the units still in the parcel as the declared value) and the attempt
    rules.
  - `partner-booking.repository.ts`, `partner-booking.constants.ts`.
- `partner-webhooks/` — updates the partner sends us, and the ones we fetch.
  - `partner-webhook.routes.ts` — `POST /api/webhooks/delivery-partners/:partnerCode` (raw body up
    to 256 KB, 300 a minute per partner and address), plus the staff routes
    `GET /admin/partners/:partnerId/webhook-receipts` and `POST …/webhook-receipts/replay`.
  - `partner-webhook.service.ts` — `logisticsPartnerWebhookService`:
    - `receivePartnerWebhook` — checks the update by the partner's `webhookVerification`
      (`SIGNATURE`, `HEADER_TOKEN`, `NOTIFY_THEN_FETCH` trusts nothing in the body, `NONE` refuses),
      saves a `PartnerWebhookReceipt` and, when genuine, queues it in the same transaction, then
      answers `200`. An unknown or switched-off partner is `404`; a failed check is `401`.
    - `processWebhookReceipt` — the outbox handler. Reads the events (or fetches them from the
      partner for `NOTIFY_THEN_FETCH`), applies each through `applyPartnerTrackingEvent` and
      stores the event, applied and unknown counts.
    - `replayWebhookReceipts` — re-queues up to 200 receipts since a time that failed or had
      unknown statuses, after staff map the new status words.
    - `deleteOldWebhookReceipts` — daily, removes receipts older than 90 days.
  - `partner-polling.service.ts` — `pollPartnerTracking`, every 15 minutes, up to 50 booked parcels
    with the partner:
    - partners that send no webhooks (`NONE`) are asked every 15 minutes;
    - partners that do are asked only about a parcel with no news for 24 hours, at most once a day.
      Each parcel is stamped `lastPolledAt` before the call; one partner failing doesn't stop the
      rest.
  - `partner-webhook.signature.ts` — signing and the constant-time secret checks.
- `customer-tracking/` — what the buyer sees (`CUSTOMER` role, their own order only; anyone
  else's order is a `404`).
  - `GET /orders/:orderId/tracking` — the order's stage, each parcel (our parcel code, the
    partner's name and tracking link: the link the partner gave us, or their template with the
    parcel number filled in) and up to 100 events, newest first. Only events meant for the buyer
    are shown: status events that were applied, plus "rescheduled" and "you told us it didn't
    arrive". Internal ones (bag tags, counts, bookings, notes, unknown partner words) never are.
  - `POST /orders/:orderId/delivery-disputes` — "I didn't receive this" for one parcel, with what
    happened (10–1000 characters). Only for a delivered parcel, within 3 days of delivery, once per
    parcel (`409 DELIVERY_ALREADY_REPORTED`; a fixed dedupe key per parcel makes a double tap one
    event), 5 an hour per buyer. It records `DELIVERY_DISPUTED` on the parcel with the buyer as the
    actor and their words as the note, so staff see it on the parcel's timeline.
- `returns/` — parcels that come back, and parcels the partner loses.
  - `return-check-in.service.ts` — `POST /hub/shipments/:shipmentId/return-check-in`
    (`logisticsManage`, staff write-limited). Staff confirm why it came back and grade every unit
    still in it as resellable or damaged, exactly once. Then:
    1. the remaining units are refunded through `orderService.refundOrderItems` with one key per
       parcel, so a retry never refunds twice;
    2. in one transaction: the parcel is marked checked in (a guarded update, so a second
       check-in is `409`), `RETURNED_TO_HUB` and each pickup's `RETURN_AT_HUB` are recorded, one
       `BrandReturn` per brand holds that brand's graded units, and the outcome's consequences
       are written;
    3. the check-in goes to the platform audit log.
  - `return-outcome.utils.ts` — `resolveReturnOutcome`, the PRD §12.1 table:

    | Outcome                            | Refund cause                                        | Refusal recorded | Brand incident                | Partner claim             |
    | ---------------------------------- | --------------------------------------------------- | ---------------- | ----------------------------- | ------------------------- |
    | Refused or unreachable, items fine | `CUSTOMER_REFUSED` (a prepaid delivery fee is kept) | yes              | no                            | no                        |
    | Wrong or damaged item              | `HUB_INSPECTION_FAILED` (everything back)           | no               | `FAILED_INSPECTION` per brand | no                        |
    | Damaged by the partner             | `PARTNER_FAILED` (everything back)                  | no               | no                            | yes, for the goods' value |

    It also checks the grading covers every unit and works out the goods' value still in the
    parcel.

  - `lost-parcel.service.ts` — `settleLostParcel(shipmentId)`. When any event moves a parcel to
    `LOST`, the tracking service queues `logistics.parcel-lost` in the same transaction; the
    handler refunds every unit still in it plus the fees (`PARTNER_FAILED`, through
    `orderService.refundOrderItemsBySystem`, since no staff member did it) and opens the partner
    claim. A second run finds nothing left to refund and the claim already open, so it does
    nothing.
  - `BrandReturn` (with `BrandReturnLine`s) is how items physically go back to a brand. It is
    created by a return check-in (`PARCEL_RETURNED`) and by a hub inspection with failed units
    (`FAILED_INSPECTION`, every unit damaged), one per bag and source. Its life:
    `AT_HUB` → (put on a rider visit) `ON_ROUND` → (rider hands it over) `DROPPED_OFF` →
    (brand confirms, or 48 hours pass) `CONFIRMED`.
  - `brand-return.service.ts` — `GET /brand/returns` (the brand's returns, newest first,
    cursor-paged, with each item's fine and damaged units) and
    `POST /brand/returns/:brandReturnId/confirm` (brand write-limited; another brand's return is
    a `404`). Confirming, in one transaction: a guarded `DROPPED_OFF` → `CONFIRMED` (a second
    confirm is `409`), the resellable units go back into stock (`InventoryMovementSource.
BRAND_RETURN`, so each return restocks once), and a returned parcel's bag records
    `RETURNED_TO_BRAND`. `confirmOverdueBrandReturns` runs hourly from `logistics.jobs.ts` and
    confirms, as the system, anything handed over more than 48 hours ago. Damaged units are never
    restocked.
- `refusals/` — refused deliveries and cash on delivery.
  - `refusal.eligibility.ts` — `checkCashOnDeliveryEligibility({ userId, phone, countryCode })`:
    cash on delivery is off once the account or the phone number (E.164) has `codRefusalLimit`
    refusals that haven't been cleared within `codRefusalWindowDays` (2 in 365 days for Nepal,
    `COUNTRY_SETTINGS`). Checkout calls it before anything else for a COD order and answers
    `422 COD_UNAVAILABLE_REFUSALS`; it imports nothing from orders, so checkout can use it
    directly.
  - Endpoints: `GET /cod-eligibility?phone=` (the buyer, for the checkout page; it answers only
    whether cash on delivery is allowed, never how many refusals a phone has, and is limited to 20
    checks a minute, because any phone can be typed into checkout),
    `GET /admin/orders/:orderId/delivery-refusals` and `POST …/clear` (a reason of 5–500
    characters, written to the platform audit log). Clearing marks the refusals cleared rather
    than deleting them.
- `cod/` — cash partners collected on delivery, and the payments they make back to Outfiqe.
  - `cod.repository.ts` — `logisticsCodRepository`:
    - `summarizeUnremittedCashByPartner` is raw SQL, because "overdue" compares each parcel's
      `deliveredAt` plus its own partner's `codRemittanceDays` with now;
    - the unpaid-in parcel list for one partner, cursor-paged, oldest delivery first;
    - the in-transaction check that ticked parcels can be paid in;
    - the remittance insert with its lines, and the remittance list and detail.
  - `cod.service.ts` — `logisticsCodService`: the report, the parcel list (with the "overdue
    only" filter worked out from the partner's limit) and `recordRemittance`.
  - `cod.utils.ts` — the views: due-by date, overdue flag and cash mismatch flag per parcel.
  - Endpoints, all under `/admin/cod`:
    - `GET /summary` and `GET /parcels?partnerId=&onlyOverdue=` (`logisticsRead`);
    - `GET /remittances?partnerId=` and `GET /remittances/:remittanceId` (`logisticsRead`);
    - `POST /remittances` (`logisticsManage`, staff write-limited, written to the platform audit
      log).
- `rider-pay/` — what contractor riders earn per visit.
  - `rider-pay.service.ts` — `logisticsRiderPayService`:
    - `recordVisitEarning(tx, taskId)` runs inside the transaction that completes or wastes a
      visit (last scan, "finish", "wasted");
    - `releaseDueRiderEarnings` is the hourly release job;
    - pay rates, the rider's own earnings, and the admin list and void.
  - `rider-pay.repository.ts` — `logisticsRiderPayRepository`. The withdraw module also uses it
    for the rider side of the balance and the mark-paid claim.
  - `rider-pay.utils.ts` — `calculateVisitEarning` and the views.
  - Endpoints:
    - `GET /admin/rider-pay-rates?countryCode=` (`logisticsRead`): the rate in effect and the
      history;
    - `POST /admin/rider-pay-rates` and `POST /admin/rider-pay-rates/:rateId/deactivate`
      (`logisticsManage`, staff write-limited, audit-logged);
    - `GET /admin/rider-earnings?riderId=&status=` (`logisticsRead`);
    - `POST /admin/rider-earnings/:earningId/void` (`logisticsManage`, a reason, audit-logged);
    - `GET /rider/earnings` (the signed-in rider: totals by status and their earnings, newest
      first).
- `reliability/` — brand reliability.
  - `brand-incident.repository.ts` — `recordIncidents(tx, incidents)`, called inside the
    transaction of whatever went wrong: an approved unavailable item (`orders/unavailable-items`),
    a hub inspection with failed units, a wasted rider visit, a return checked in as wrong or
    damaged. `(kind, sourceKey)` is unique and inserts skip duplicates, so a retried step counts
    once. Customer refusals and partner failures are never incidents.
  - `brand-pickup-history.repository.ts` — per brand: its first hub pickup, how many it has had in
    all, and how many in the last 30 days (two `groupBy` queries on `order_fulfilment_groups`).
  - Endpoints:
    - `GET /brand/reliability`: the brand's problems and incidents for the last 30 days
      (cursor-paged), its hub pickups in that time, the share that had a problem, whether it is
      still new to Outfiqe pickup, and its level.
    - `GET /admin/brand-reliability` (`logisticsRead`): every brand with 3 or more problems, most
      first, with the same figures. The watch list stays at 3 so staff can step in early, before
      the brand is warned.
  - `reliability.utils.ts` — how the level is decided (`RELIABILITY_THRESHOLDS`,
    `NEW_BRAND_GRACE`):
    - **Warning:** at least 5 problems **and** more than 10% of the brand's hub pickups in the
      window.
    - **Review:** at least 10 problems **and** more than 20%.
    - **No level for new brands:** a brand stays in good standing during its first 30 days of
      Outfiqe pickup, and until it has had 20 hub pickups, whichever comes later.

    A share with no pickups in the window counts as 100%. Suspension stays an admin decision with
    the existing brand tools.
- `tracking/` — the single write path for every pickup and parcel status change.
  - `tracking.service.ts` — `logisticsTrackingService`:
    - `recordEvent(input)` opens its own transaction and announces stage changes after commit.
    - `recordEventInTransaction(tx, input)` is for callers that already hold a transaction. They
      call `announceStageChange(outcome)` themselves once it commits.
  - `tracking.repository.ts` — `logisticsTrackingRepository`. It covers:
    - the event insert with dedupe;
    - the guarded pickup and parcel status moves;
    - stamping the coarse status on parcel groups;
    - the order group snapshots used to work out the customer stage.
  - `tracking.state-machine.ts` — `PICKUP_STATUS_NEXT`, `SHIPMENT_STATUS_NEXT` and
    `canApplyStatusMove`.
  - `tracking.mapping.ts` — event code → pickup or parcel status; detailed status → the existing
    coarse `FulfilmentStatus`; the timestamp columns each status stamps.
  - `tracking.stage.ts` — `describeOrderTrackingStage`, the one customer-facing stage for an
    order, plus `hasTrackingStageChanged`.
  - `tracking.constants.ts`, `tracking.types.ts` — stage codes, subject kinds and shapes.

## Funnel

**User-facing:**

- Hub staff set up a hub (address, time zone, working week, opening hours, pickup rounds,
  ready-by cutoff, partner collection time) and pick the delivery zones its riders collect from.
- A brand adds its pickup locations and sees whether Outfiqe collects from each one.
- At checkout, each brand in the order is put on the hub flow or the brand-ships flow, and the
  order records its delivery promise.

**Brand side of a hub order:** `orders/fulfilment-groups` is told about the flow too:

- The brand order list and detail include `fulfilmentMode`, `pickupStatus` and, on the detail, the pickup code.
- `shipTo` (the customer's name, phone and address) is `null` for hub-flow groups, because the brand never needs it.
- The brand's own status updates (`PATCH /orders/brand/fulfilment-groups/:groupId`) are refused for hub-flow groups with `409 DELIVERED_BY_OUTFIQE`.

**Riders and rounds:**

- Staff invite a rider, who sets a password from the email link. Staff check a contractor's ID in
  person, then activate them.
- Staff print a sticker sheet, open the pickup board, tick the ready bags at a brand location and
  assign them to a rider for a round.
- The rider opens the visit on their phone, scans the brand's pickup slip, sticks a new sticker on
  the bag and scans it. With no signal, the scan waits on the phone and sends later.
- If the shop is closed the rider marks the visit wasted; if only some bags are ready they finish
  with what they have. Either way the rest go back on the board.

**At the hub and with the partner:**

- Staff set up each delivery partner once: our merchant account at the hub, the delivery zones
  they cover (with a priority), and how their status words map to ours.
- When a rider brings bags in, staff count the units and scan each bag's sticker. Then they inspect
  each bag; failed units are refunded to the customer straight away.
- Once every bag of the order is in (or staff choose to pack only what's there) and every bag at
  the hub is inspected, they pack one parcel. A bag whose items all failed inspection stays out of
  it and goes back to the brand. It gets an `OFQ` code and is offered to the best partner for the customer's area.
- Staff book it in the partner's own portal, typing our code into their reference field, then type
  the partner's parcel number back into Outfiqe and print our label.
- When the partner's rider collects, staff scan each label. Parcels that aren't booked, or whose
  label shows old cash, are refused.
- The partner's daily status sheet is uploaded; each row moves its parcel on, and "delivered"
  delivers the order to the customer, every brand in it, and their payouts.
- With a partner connected by API, none of the typing happens: packing books the parcel with the
  partner in the background, and the partner's updates arrive by webhook (or we ask for them).
  Staff paste our webhook address and secret into the partner's dashboard once. A booking the
  partner refuses shows as failed with the reason, and staff press "Try again" or pick another
  partner. Updates with a status word we don't know are kept; staff map the word and replay them.

**Technical, for an API partner:**

1. Packing (or rebooking) creates the booking and an outbox event in one transaction.
2. The outbox worker runs `processBookingRequest`, which sends our parcel code as the merchant
   reference and the booking id as the idempotency key.
3. The partner's webhook is saved as a receipt and queued in one transaction, and `200` goes back
   straight away.
4. The worker runs `processWebhookReceipt`, and each event goes through
   `applyPartnerTrackingEvent` → `recordEvent`, exactly as a status sheet row does.

**Technical, for a collection scan** (`rider-task.service.ts`), in one transaction:

1. Load the visit (it must be this rider's) and the active collect stop for the pickup code.
2. If that stop is already scanned with the same sticker, answer success without changing
   anything (an offline retry with a new key). A different sticker is `409`.
3. Refuse a closed visit, a pickup that is no longer `READY_FOR_PICKUP` (cancelled meanwhile), an
   unknown sticker, a sticker from another hub, or a used sticker.
4. Work out the event time from the phone's scan time (see below).
5. Attach the sticker and mark the stop scanned, each with a guarded `updateMany`.
6. Record `PICKED_UP` and `BAG_TAGGED` through `recordEventInTransaction`.
7. Move the visit to `COMPLETED` when every active stop is scanned, otherwise `IN_PROGRESS`.

After commit, `announceStageChange` tells the customer if their order's stage moved.

**Technical, at checkout:**

1. `orders/checkout/checkout.fulfilment.ts` calls `logisticsService.resolveFulfilmentAssignments`
   and `deliveryZoneService.estimateDeliveryWindow`, before the order transaction opens.
2. `checkout.commit.ts` creates each brand's fulfilment group from the result. A hub-flow group
   starts at `AWAITING_BRAND` with a fresh pickup code.

**Technical, for status changes:**

**Technical:** a caller builds a `RecordTrackingEventInput` and calls
`logisticsService.recordEvent`, which runs these steps in one transaction:

1. Insert the `TrackingEvent`. A duplicate `(source, dedupeKey)` returns the first event and
   changes nothing.
2. Check the move against the state machine and the event's `occurredAt`.
3. Run a guarded `updateMany` on the pickup or parcel.
4. Stamp the coarse group status.
5. Recompute the order through `orderRepository.refreshOrderFulfilmentRollup`.

After commit, `ORDER_STATUS_CHANGED` is published only when the customer-facing stage changed. It
carries the new `trackingStage`, so the notification and the push message say where the order is
("Your order is out for delivery") using `ORDER_TRACKING_STAGE_MESSAGES` from `@outfiqe/utils`.
The web order page listens for that notification and refreshes itself.

## Non-obvious rationale

- **Brand reliability uses a rate and a grace period, not a flat count.** It started as "warned at 3
  problems in 30 days". That is excellent for a brand with 300 pickups and alarming for one with 5,
  and it would have warned new brands while they were still learning the flow at launch. So:
  - a warning needs both enough problems (5) and a meaningful share of pickups (over 10%);
  - brands in their first 30 days or first 20 pickups are never warned.

  Staff still see every brand from 3 problems on, so a person can reach out before anything
  formal happens.

- **Who pays for a return is decided at the hub, not from the partner's word.** The partner says
  "refused" or "returning"; only staff holding the parcel can tell a genuine refusal from a wrong
  item or partner damage, so refunds, refusals, incidents and claims all wait for the check-in.
- **A lost parcel is settled from the outbox, not where `LOST` is recorded.** `LOST` can arrive
  from a webhook, a poll, a status sheet or a staff update. Queuing the settlement inside the
  tracking transaction catches every one of them, and a refund that fails is retried by the
  outbox rather than lost.
- **Refusals match on the phone number as well as the account**, so a new account with the same
  number doesn't get cash on delivery back.

- **Checkout imports `flow/flow.service.ts`, not `logisticsService`.** Hub operations call
  `orderService` (refunds and cash to collect), and `orderService` loads checkout. If checkout
  imported the logistics root object, loading the app would go round that loop and the root would
  spread a topic service before it existed, crashing at start-up ("Cannot access … before
  initialization"). `flow/` imports nothing from orders, so checkout uses it directly.
- **A parcel's cash is recomputed, not pushed.** A refund after packing doesn't reach into
  logistics. Instead the label, the "label printed" step and the handover scan all recompute the
  parcel's cash from the order. A change records `COD_AMOUNT_CHANGED`, and the handover is blocked
  until a new label is printed (`labelCodAmount` is what the printed label shows). Orders stay free
  of any dependency on logistics, and a parcel still can't leave with an old amount.
- **Partner events dedupe by booking.** The same update can arrive by the partner's number in one
  sheet and by our parcel code in another. Hashing the matched booking, not whichever reference
  the row used, makes both count once. Partner dedupe keys start with the partner id, so the
  existing `(source, dedupeKey)` unique key still keeps partners apart.
- **An unknown adapter key falls back to manual.** Keys are checked when a partner is saved, so
  this only matters if an adapter is removed later; the safe fallback is staff booking by hand.
- **A partner's first update can skip the handover scan.** If the partner reports a status past
  "collected" for a parcel still `PACKED`, the update is applied and `HANDOVER_NOT_SCANNED` is
  recorded for follow-up.
- **Status sheets go through the normal JSON body limit.** A sheet is capped at 80,000 characters
  and 500 rows rather than raising the API-wide body limit; each row is its own short transaction,
  applied in sheet order.

- **The webhook receiver is mounted before `express.json()`.** The signature is over the exact
  bytes the partner sent; parsing and re-serialising JSON would change them. The route reads the
  raw body itself and has its own size limit, rate limit and request logging.
- **A webhook is saved first and worked on later.** Answering `200` only after the receipt and
  its outbox event commit means a crash can't lose an update, and a slow tracking write can't make
  the partner time out and resend. Partners resend anyway, so every event is deduped by booking.
- **An update that fails the check is recorded without its body.** The receipt row shows staff
  that something was turned away, but storing up to 256 KB from anyone who can reach the address
  would let them fill the database.
- **Booking looks the parcel up before trying again.** A timeout can hide a booking the partner
  did make. Asking by our parcel code first (and sending the booking id as the idempotency key)
  stops one parcel being booked twice.
- **Reasons shown to staff are ours, not the raw error.** A booking's `failureReason` and a
  receipt's `processingError` hold the partner-facing message from `PartnerRequestError`, or a
  generic line; the full error goes to the log.
- **Partner work has its own outbox queue** (`outbox-logistics`), so a slow partner API can't hold
  up notifications or stock updates.

- **A bag or a return can be on only one active visit, enforced by the database.** The partial
  unique indexes `rider_task_stops_one_active_collect_stop_per_group_key` (one active collection
  per bag) and `rider_task_stops_one_active_stop_per_return_key` (one active stop per brand
  return) turn two staff assigning the same stop at once into one `409 PICKUPS_NOT_ASSIGNABLE`.
  Returns are keyed by the return, not the bag, because one bag can send two returns back (a
  failed inspection and a refused parcel). A check constraint makes every `RETURN` stop name its
  return and no `COLLECT` stop name one.
  Releasing a stop sets `is_active = false`, which puts the bag back on the board.
- **Scans are idempotent twice over.** The `Idempotency-Key` (generated once per scan on the phone
  and kept with the queued scan) replays the stored answer for the same key. A retry with a new key
  still can't scan twice: the stop and the sticker are claimed with guarded updates, and a repeat
  of the same pickup + sticker pair is answered as success.
- **The phone's scan time is trusted, within limits** (`resolveScanOccurredAt` in
  `rounds.utils.ts`):
  - a time in the future becomes "now";
  - a time before the brand marked the bag ready (a slow phone clock) is moved up to that moment,
    so the state machine doesn't drop it as out of order;
  - a scan more than 24 hours old is refused (`422 SCAN_TOO_OLD`) and handled by hub staff.
- **Suspension revokes sessions in the same transaction as the status change**, so a suspended
  rider's phone can't refresh its way back in, and their visits can't keep collecting.
- **The existing order status fields are kept and fed, not replaced.**
  - `OrderFulfilmentGroup.status`, `Order.fulfilmentStatus` and `Order.fulfilmentSummary` are
    still the only things existing screens, reports, commission sweeps and payout sweeps read.
  - Every detailed status maps onto them in `tracking.mapping.ts`, and the order rollup stays
    `deriveOrderFulfilment`. So `Order.deliveredAt` is still stamped exactly once, when every
    group is delivered.
- **A status is never copied; it is derived.**
  - Once a pickup is `IN_PARCEL`, its customer stage and coarse status come from its parcel.
  - A parcel event updates the coarse status of every group in that parcel in the same
    transaction. One "delivered" event therefore delivers every brand in the parcel at once.
- **Events never move a status backwards.**
  - A move must be in the allowed list, and an event that happened before the current status was
    set is stored but not applied (`appliedToStatus = false`). Out-of-order partner webhooks are
    therefore harmless.
  - Partners may skip steps forward. Only an admin correction (`isCorrection`) bypasses the
    rules, and it still leaves a recorded event.
- **The guarded update retries once.** The pickup or parcel row is updated only while it still
  holds the status that was read. If another transaction changed it first, the event re-reads and
  re-checks once rather than overwriting a newer status.
- **Coarse mapping choices:**
  - A lost parcel counts as `CANCELLED`, because the customer is refunded.
  - A pickup that never reached a parcel and is going back to its brand (every line refunded at
    the hub) also counts as `CANCELLED`.
  - A pickup coming back from a returned parcel counts as `RETURNED`.
  - This keeps the existing "every group closed" rule in `deriveOrderFulfilment` correct.
- **Cash collected is stored when the parcel moves to `DELIVERED`, not on every event.**
  - The partner's amount comes from its webhook, its tracking poll, the status spreadsheet or a
    staff update (`codCollectedAmount`, only allowed with "Delivered").
  - When nobody reports an amount, the parcel's `codAmountToCollect` is taken as collected.
  - A different amount still delivers the parcel. It adds a `COD_COLLECTED_MISMATCH` event and a
    warning log, and the parcel shows "Label said …" in Partner cash.
  - A repeated "delivered" doesn't move the status, so it never overwrites the stored amount.
  - The order itself moves from `DUE` to `PAID` in the orders rollup (see `orders/README.md`).
- **A parcel's cash can be paid in only once.**
  - `CodRemittanceLine.shipmentId` is unique, so two payments recorded at the same moment for the
    same parcel can't both succeed. The loser gets `409 PARCELS_NOT_REMITTABLE`.
  - `(partnerId, reference)` is unique, so a retried form gets `409 REMITTANCE_ALREADY_RECORDED`
    instead of a second payment.
- **The server works out every remittance amount.**
  - Each line's cash is read from the parcel, never sent by the browser.
  - Staff send only the parcels, the fee per parcel and the amount the bank shows.
  - When that amount isn't the parcels' cash minus the fees, the payment is refused
    (`422 REMITTANCE_TOTAL_MISMATCH`), so finance fixes the ticks rather than saving a wrong
    record.
  - CHECK constraints hold the same sums in the database.
- **The partner that holds a parcel's cash is its live (`BOOKED`) booking.** A rebooked parcel's
  cash belongs to the partner that delivered it.
- **Rider pay is earned in the same transaction that ends the visit.**
  - A finished visit pays `visitAmount + extraStopAmount × (stops − 1)`. Stops are the bags
    collected and returns handed over on that visit.
  - A wasted visit pays `wastedVisitAmount`; a cancelled visit pays nothing.
  - `RiderEarning.riderTaskId` is unique and inserts skip duplicates, so a retried scan or
    "finish" can't pay twice.
  - Employees get no earning rows; their salary is outside Outfiqe.
- **The rate is copied onto each earning.** A new rate (which can start now or later, never in
  the past) changes only visits finished after it starts.
- **No rate set falls back to the country default** (`COUNTRY_SETTINGS.contractorRiderPay`, the
  launch Rs 70 / 15 / 35) and logs a warning. A missing setting never loses a rider's pay, and it
  never blocks a scan.
- **Earnings are held for the brand-payout holding period** (`RETURN_WINDOW_MS`), then move to
  available.
  - Riders withdraw on the person (`CREATOR`) side of the withdraw system. Its balance and
    mark-paid claim count rider earnings next to commission and Offer money.
  - A withdrawn earning can't be voided; staff void only on-hold or available ones.
- **Each alert fires once per stage of its subject.**
  - `(alertType, subjectKey)` is unique and inserts skip duplicates, so the job can run as often
    as it likes.
  - The subject key carries the stage where one subject can need the same alert again: the
    round for a missed round, the booking for a partner that didn't collect, and the parcel's
    status and last event time for partner silence.
- **Time-based alerts clear themselves** when their subject moves on: the bag is marked ready or
  picked up, the parcel is packed or moves, the order is delivered, the cash is paid in.
  - "No partner update" compares two columns (a new event after the alert was raised), so it
    clears with one raw SQL update.
  - Event alerts (an unknown partner status, a count or cash mismatch) wait for staff to resolve
    them with a note.
- **Event alerts are raised in the same transaction as the event.** The tracking service inserts
  the alert when it records `UNKNOWN_PARTNER_STATUS` or `COUNT_MISMATCH`, and when a delivered
  parcel's cash doesn't match. A rolled-back event never leaves an alert behind.
- **Notifications are sent after the alert is saved, by the job, and at most once.**
  - The job claims each new alert (`notifiedAt`) before sending, so two overlapping runs can't
    both send it.
  - If a send fails, it is logged and not retried. The alerts page is the record; notifications
    are the nudge.
  - Who hears about it:
    - the brand (`LOGISTICS_BRAND_NOTICE`) for a bag not marked ready after 1 working day;
    - staff with `platform:logistics:manage` (`LOGISTICS_STAFF_ALERT`) for everything else,
      including COD and remittance alerts;
    - the customer (`ORDER_DELIVERY_LATE`, an apology) when the promised date passes.
- **Working days are the hub's.** The database narrows the candidates by calendar days, which is
  never later than working days. The exact deadline is then worked out in the hub's time zone and
  working week.
- **Batches.** A rule looks at up to 200 subjects per run, oldest first. A parcel whose
  "no partner update" alert was resolved by hand while it is still quiet stays a candidate (its
  key already exists, so nothing new is raised). Many of those at once could slow other parcels'
  alerts; resolving such alerts by hand is rare.
- **The job's queries have their own indexes** (`20261023100000_index_logistics_alert_scans`):
  - orders by promised date;
  - waiting bags by pickup status and age, and by hub arrival time;
  - unscanned rider stops;
  - alerts by order, bag or parcel and type.

  The partial ones use only conditions the planner can prove from Prisma's parameters (`IS NULL`,
  or a range on the indexed column), so they are used even with prepared statements.

- **The status spreadsheet is applied one row at a time, in the request.** Each row is about 15
  queries, so a 500-row sheet takes tens of seconds. Running rows in parallel would hold several
  of the small production pool's connections (`DATABASE_POOL_MAX=3`) for the whole import and slow
  every other request, so it stays sequential. If daily sheets grow past a few hundred rows, move
  the import to a background job and let the page poll for the report.
- Brand-shipped orders keep the old daily stale-shipment email; it now leaves hub orders out,
  because their alerts replace it.

## Going live

Everything above ships switched off. The order of a safe launch:

1. **Set up the hub in admin.**
   - Logistics → Hubs: the hub's address, time zone, working days, hours, pickup round times, the
     ready-by cutoff and the partner collection time.
   - Pickup areas: the delivery zones its riders cover.
   - Delivery zones: shortest and longest delivery days for each zone. The delivery promise and
     the "promise at risk" and "promise missed" alerts read them.
2. **Set up each delivery partner.**
   - Logistics → Delivery partners: the merchant account at the hub, the zones it delivers to, and
     its status names.
   - A partner with API access also needs its `DELIVERY_PARTNER_<KEY>_*` secrets in the
     environment, and our webhook address pasted into the partner's dashboard.
3. **Set up the people.**
   - Hub staff: a Team-page role with `platform:logistics:read` or `platform:logistics:manage`.
     Manage holders receive delivery alerts.
   - Riders: invite them, check each contractor's ID in person, then activate them.
   - Print at least one sheet of bag stickers.
4. **Check the money settings.**
   - Rider pay: set a rate under Logistics → Rider pay, or keep the launch default (Rs 70 / 15 /
     35).
   - Withdrawals: the "Muses and riders" withdrawal policy applies to riders too.
   - COD: each partner's paying-in limit (`codRemittanceDays`).
5. **Make sure the scheduled jobs run** on the process that runs jobs:
   - `logistics-alerts` (every 10 minutes);
   - `logistics-rider-earning-release` and `logistics-brand-return-auto-confirm` (hourly);
   - partner polling, and the stuck-booking and webhook-receipt sweeps.
6. **Switch it on for a few brands first.**
   - Admin → Feature switches → `order_logistics`: add test brands to the allow-list.
   - Those brands add a pickup location. Orders placed after that use the hub; earlier orders
     keep the brand-shipped flow.
   - Run the checks below, then widen the allow-list, and switch to everyone last.
7. **Before switching to everyone:**
   - a lawyer has checked the contractor terms;
   - rider pay rates are confirmed with riders;
   - a second partial refund has been tried in the Khalti sandbox;
   - a rider has scanned with a real phone (camera, typed code, and offline then back online);
   - labels and sticker sheets have printed on the hub's printer;
   - a full order has gone through by hand with the flag on: pickup location, multi-brand order,
     ready for pickup, rider scan, check-in, an inspection failure with a refund, packing and the
     label, manual booking, the status spreadsheet, the customer's live timeline, and the payouts
     maturing.

**Switching it off** stops new orders from using the hub; they go back to the brand-shipped flow.
Orders already in the hub flow carry on through it, so keep the hub, riders and partners running
until those are delivered or returned.
