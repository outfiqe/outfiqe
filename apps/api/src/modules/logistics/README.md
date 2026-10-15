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

**User-facing:** none yet. Brands, riders, hub staff and partners record events through the
screens and endpoints added in later steps.

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
