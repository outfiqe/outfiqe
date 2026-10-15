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
- `logistics.routes.ts` — mounted at `/api/logistics`. It routes `/admin/hubs` to `hubs/` and
  `/brand/pickup-locations` to `pickup-locations/`.
- `logistics.rate-limits.ts` — the per-user write limiters shared by every topic's routes: one for
  staff and one for brands.
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
