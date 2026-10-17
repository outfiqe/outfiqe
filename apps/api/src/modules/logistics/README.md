# logistics

## Purpose

Outfiqe-run delivery. Brands press "Ready for pickup". An Outfiqe rider collects the items with
a scan. The Outfiqe hub checks them and combines each order into one parcel. Any delivery partner
takes the parcel to the customer. Every step is a recorded tracking event. The full behaviour is in
`docs/PRD-ORDER-LOGISTICS.md`.

The whole flow sits behind the `order_logistics` feature flag. Orders keep today's brand-shipped
flow (`FulfilmentMode.BRAND_SHIPS`) until the flag is on for their brand.

## Structure

The module is built in steps. This README lists what exists now.

- `logistics.service.ts` — `logisticsService`, the only object other modules import. It
  spreads in every topic service.
- `logistics.repository.ts` — `logisticsRepository`, spreading in every topic repository.
- `logistics.routes.ts` — mounted at `/api/logistics`:
  - `/admin/hubs` → `hubs/`, `/admin/riders` → `riders/`, `/admin/bag-tag-batches` → `bag-tags/`;
  - `/admin/pickup-board` and `/admin/rider-tasks` → `rounds/` (staff);
  - `/brand/pickup-locations` → `pickup-locations/`, `/brand/pickups` → `pickups/`;
  - `/rider/tasks` → `rounds/` (riders).
- `logistics.rate-limits.ts` — the per-user limiters shared by every topic's routes: staff writes,
  brand writes and rider scans.
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
- `bag-tags/` — sticker batches (`GET /`, `POST /`, `GET /:batchId`). A batch belongs to one open
  hub and holds 1–500 random 10-character codes (unique; collisions are re-drawn). A sticker is
  "used" once it is attached to a pickup, and can only ever be attached once.
- `rounds/` — pickup rounds:
  - Staff (`rounds.routes.ts`, `rounds.service.ts`):
    - `GET /admin/pickup-board?hubId=` — pickup locations with bags marked ready and not yet on an
      active visit, cursor-paged by location.
    - `POST /admin/rider-tasks` — one visit: one active rider at the rider's hub, one pickup
      location, 1–50 of its waiting bags. Records `RIDER_ASSIGNED` per bag.
    - `GET /admin/rider-tasks?hubId=` and `POST /admin/rider-tasks/:taskId/cancel` (only before
      anything is collected).
  - Riders (`rider-task.routes.ts`, `rider-task.service.ts`, `RIDER` role, `ACTIVE` profile, scan
    rate limit):
    - `GET /rider/tasks`, `GET /rider/tasks/:taskId` — their open visits, with the pickup address,
      contact and bags.
    - `POST /rider/tasks/:taskId/collect-scans` — pickup code + sticker code + phone scan time,
      with a required `Idempotency-Key`. See the funnel below.
    - `POST /rider/tasks/:taskId/wasted` (nothing collected, with a reason; records
      `VISIT_WASTED`) and `POST /rider/tasks/:taskId/finish` (some collected; the rest go back on
      the board).
- `flow/` — `resolveFulfilmentAssignments({ brandIds })`, which checkout calls before its
  transaction to decide each brand's flow.
  - A brand goes through the hub (`OUTFIQE_LOGISTICS`, with its hub and pickup location) when:
    - the `order_logistics` flag is on for it (`EVERYONE`, or the brand is on the allow-list);
    - its default pickup location is in an active hub's pickup area.
  - Otherwise it stays `BRAND_SHIPS`.
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

After commit, `ORDER_STATUS_CHANGED` is published only when the customer-facing stage changed.

## Non-obvious rationale

- **Keep the `order_logistics` flag off until delivery partners exist.**
  - The flow decision today checks the flag and pickup coverage only.
  - The check that a delivery partner covers the customer's city from the hub arrives with
    delivery partners (step 6 of `docs/PRD-ORDER-LOGISTICS.md`).
  - Until then, switching the flag on for a brand would send its orders to a hub that has no
    partner to deliver them.

- **A bag can be on only one active visit, enforced by the database.** The partial unique index
  `rider_task_stops_one_active_stop_per_group_direction_key` (one active stop per group and
  direction) turns two staff assigning the same bag at once into one `409 PICKUPS_NOT_ASSIGNABLE`.
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
