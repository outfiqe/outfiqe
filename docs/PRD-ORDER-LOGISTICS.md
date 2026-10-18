# Outfiqe Order Logistics & Partial Refunds — PRD

Internal reference doc, committed to the repo. It replaces "each brand ships its own parcel" with
an Outfiqe-run delivery chain: **our rider collects from the brand, our hub checks and combines the
items, and a delivery partner takes the parcel to the customer.** Every step is tracked in one
clean record, from the order being placed to the parcel being delivered or coming back.

It also adds **partial refunds** (refunding some items or units of an order instead of all or
nothing), which the new chain needs: the hub can reject one damaged item out of a combined order.

**Launch market: Nepal (Kathmandu Valley hub).** Everything is built so that opening another
country is configuration plus a delivery partner adapter, not a redesign (section 16).

Companion docs: `PRD-COMMERCE.md` (orders, checkout), `PRD-BRAND-PAYOUTS.md` (settlement ledger),
`PRD-BANK-WITHDRAW.md` (withdrawals). Code that changes lives mainly in
`apps/api/src/modules/orders` and a new `apps/api/src/modules/logistics`.

Status: built, tested and switched off behind the `order_logistics` feature switch, ready for a
team-only trial. Launch decisions are locked (section 2). Section 22 walks through every role's
journey, step by step, as built. The going-live order is in `apps/api/src/modules/logistics/README.md`
("Going live").

---

## 1. What changes and why

**Today** a brand advances its own `OrderFulfilmentGroup` through `PLACED → PACKED → SHIPPED →
DELIVERED`, types a free-text `carrier` and `trackingNumber`, and marks the order delivered itself.
Nothing checks that the parcel left, that the tracking number is real, or that the customer got
it. Brands also see the buyer's phone and address, because they hand parcels to couriers.

**New flow:**

```
Customer orders
      │
      ▼
Brand packs and marks "Ready for pickup"   ── one pickup per brand per order
      │  our rider scans the brand's pickup code and tags the bag
      ▼
Outfiqe hub: check in, inspect, combine    ── all brands' items in one parcel
      │  delivery partner collects the parcel
      ▼
Delivery partner: in transit → out for delivery → delivered / failed / returned
```

What this gives us:

- **One parcel per order** even when the customer bought from three brands. That matches the
  single delivery fee they paid.
- **Proof at every handover.** Brand → rider, rider → hub and hub → partner are each confirmed by
  a scan, so "I gave it to you" disputes can be settled from data.
- **Brands never touch delivery.** Their job ends when the rider scans their pickup code. They no
  longer see the buyer's phone or address.
- **Any delivery partner can be plugged in** through one contract (section 9). A partner with no
  API at all still works from day one through the manual adapter.
- **Delivery is confirmed by the partner, not the brand**, so commission and payout maturity
  (which read `Order.deliveredAt`) start from a trustworthy event.

## 2. Launch decisions (locked)

| Decision                                 | Answer                                                                                                                                                                                                                                                                                                                                                       | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Which orders use the hub**             | Any brand whose **pickup location** is inside the Kathmandu Valley, delivering to every city a partner covers from the hub. Brands outside the valley keep shipping themselves (`BRAND_SHIPS`). Delivery coverage starts with valley cities and is widened to the rest of Nepal by adding partner coverage rows in admin, with no code change.               | About 90% of active online merchants are in the valley ([Kathmandu Post, 2026](https://kathmandupost.com/money/2026/08/27/fast-delivery-changes-the-game-for-nepal-s-online-sellers)). Even in 2021, under half of Daraz's orders came from inside the valley ([Kathmandu Post, 2021](https://kathmandupost.com/money/2021/11/10/we-cannot-compare-internet-boom-with-e-commerce-growth)). What limits the rider pickup is where the brand is, not where the customer is.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **Customer refuses or can't be reached** | **Prepaid:** goods refunded, delivery fee kept. **Wrong or damaged item:** everything refunded, including the fee. **COD:** nothing was collected, so nothing to keep. After 2 refusals in 12 months on the same account or phone number, COD is switched off for that customer and they must prepay. **Brands are never charged for a customer's refusal.** | The E-Commerce Act 2081 §10 refund right covers goods not as described, and is silent on delivery fees ([§10](https://nepallaws.com/Laws/electronic-commerce-e-commerce-act-2081/chapter-2-operation-of-electronic-commerce/section-10-goods-or-services-may-be-returned/)). Return and delivery terms must be disclosed up front ([compliance guide](https://www.blanxer.com/resources/ecommerce-compliance)), so this goes on the published terms page. COD orders are refused far more often than prepaid ones (vendor figures, about 20–35% vs under 8%: [Shipmozo](https://www.shipmozo.com/blog/cod-fraud-in-indian-e-commerce), [EasySell](https://easysellapp.com/blogs/wiki/cod-customers-refuse-delivery-how-to-stop-it)). Daraz doesn't charge sellers for failed deliveries ([ShareSansar](https://www.sharesansar.com/newsdetail/daraz-express-dex-launches-advanced-last-mile-delivery-service-across-nepal-2025-11-02)). |
| **Damaged item found at the hub**        | **Refund only.** The rest of the parcel goes out on time. The failure counts against the brand's reliability score (section 15), and the item goes back to the brand.                                                                                                                                                                                        | §10 allows a replacement only if the buyer wants it, otherwise a refund including tax. §16(g) makes sellers refund defective goods ([§16](https://nepallaws.com/Laws/electronic-commerce-e-commerce-act-2081/chapter-3-obligations-of-parties-involved-in-electronic-commerce/section-16-sellers-liability/)). A replacement would hold up the other brands' items in the same parcel.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Rider pay**                            | **Contractors:** Rs 70 per brand visit (covers the first order), Rs 15 per extra order collected or returned on the same visit, and Rs 35 for a wasted visit (brand not ready, counted against the brand). **Employees:** salary of Rs 30,000–40,000 a month. Rates live in `RiderPayRate` and can change without a deploy.                                  | Minimum wage is Rs 19,550/month, Rs 754/day ([Himalayan Times](https://thehimalayantimes.com/nepal/govt-hikes-workers-minimum-wage-to-rs-19550-per-month), [Pradhan Law](https://pradhanlaw.com/publications/minimum-remuneration-notice-2082-2025-ad)). Daraz rider jobs list Rs 30–40k ([KumariJob](https://www.kumarijob.com/daraz-nepal/63378-delivery-rider)). Specialist delivery companies charge Rs 70–80 per delivery ([Kathmandu Post, 2026](https://kathmandupost.com/money/2026/08/27/fast-delivery-changes-the-game-for-nepal-s-online-sellers)). 20 visits a day × Rs 70 is about Rs 36,000 over 26 working days.                                                                                                                                                                                                                                                                                                         |

**Before hiring the first contractor:**

- A lawyer confirms the contractor terms hold up under the Labour Act 2074. Contractors pick their
  own rounds and aren't given fixed shifts, so they aren't treated as employees.
- The rates above are checked by talking to 3–5 Kathmandu riders, because published per-delivery
  pay data for Nepal is thin.

## 3. How a working day runs

The system is built around how the valley actually moves: fixed pickup rounds, not on-demand
pickups.

**Hub settings** (`Hub`, editable in admin). Nepal launch defaults:

| Setting                     | Default                            |
| --------------------------- | ---------------------------------- |
| Time zone                   | `Asia/Kathmandu`                   |
| Working days                | Sunday–Friday (Saturday off)       |
| Hub open                    | 09:00–19:00                        |
| Pickup rounds               | 11:00 and 15:00                    |
| Ready-by cutoff for a round | 60 minutes before the round starts |
| Partner collection          | Daily at 17:30                     |

**The day:**

1. **Brands pack** and press "Ready for pickup" before the cutoff. The order then joins the next
   round. Each pickup gets an 8-character **pickup code** (no confusable letters), shown in the
   brand dashboard as a QR code and as text. **Brands don't need a printer.** A brand with one can
   print the pickup slip instead.
2. **Ops build the round:** the pickup board groups ready pickups by brand and area. Each rider
   gets one task per brand visit. Items going back to a brand (failed inspection, returns) ride
   along on that brand's next visit, so there's no extra trip.
3. **The rider at the brand** scans the brand's pickup QR (from screen or slip), then scans a
   **bag tag**: a pre-printed Outfiqe sticker with its own QR, stuck on the bag. From that moment
   the bag tag identifies the pickup. If the camera fails, the rider can type the code instead.
4. **At the hub**, staff scan the bag tag, confirm the unit count and inspect the items: right
   item, right size, no damage.
5. **Packing:** when every pickup in an order is in, staff pack one parcel. They print a 100 × 150
   mm thermal label with our tracking code, and the system books it with the partner.
6. **Partner collection at 17:30:** staff scan each parcel out, and the partner takes it.

**Equipment:**

- **Riders:** an Android phone with a camera and mobile data. The `/rider` screens work offline
  and sync later.
- **Hub:** a laptop or phone, an optional USB barcode scanner (it types into the same inputs), a
  thermal label printer, bag-tag sticker rolls, and packing material.

## 4. The three things we track

| Unit       | What it is                                                    | Table                             | How many              |
| ---------- | ------------------------------------------------------------- | --------------------------------- | --------------------- |
| **Pickup** | One brand's items in one order. Moved by our rider.           | `OrderFulfilmentGroup` (existing) | One per brand         |
| **Parcel** | The package that leaves our hub. Moved by a delivery partner. | `Shipment` (new)                  | Usually one per order |
| **Order**  | What the customer sees.                                       | `Order` (existing, rollup only)   | One                   |

Item-level facts (how many units were refunded, inspection results) live on `OrderItem` and the
refund tables, not as a fourth status.

### Accounts: who logs in where

| Person                                     | Account in Outfiqe                                                                                                                          | Account on the partner's system                                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hub staff, ops, finance                    | **Existing** admin accounts, on a Team-page custom role holding the new `platform:logistics:read` / `platform:logistics:manage` permissions | They use the shared Outfiqe merchant login when booking or checking by hand                                                                                                                                                           |
| Outfiqe riders (employees and contractors) | **New** `RIDER` account, invite-only. This is the only new account type.                                                                    | None                                                                                                                                                                                                                                  |
| Delivery partner                           | **None.** Partners never log into Outfiqe. Their system talks to ours through their API and our webhook.                                    | —                                                                                                                                                                                                                                     |
| Outfiqe (the company)                      | —                                                                                                                                           | **One merchant account per partner**, opened by the partner for Outfiqe. This is how they know parcels are ours. The website login is kept in the company password manager, never in Outfiqe. The API key lives in server env config. |

**Webhooks, in plain words:**

- The partner's system is the **sender**; our webhook address is the **receiver**.
- During setup we paste our address and webhook secret into the webhook setting of our merchant
  account on the partner's dashboard.
- From then on their system sends every status change to us automatically.
- Partners build nothing for us.

### Printing

Pickup slips, bag-tag sticker sheets and parcel labels are **print-ready web pages**, printed with
the browser's Print button:

- Parcel labels are sized 100 × 150 mm for the hub's thermal printer.
- No PDF library is involved, and any printer works.
- Brands never have to print, because the pickup QR also shows on screen.

## 5. Statuses

### 5.1 Pickup status (`PickupStatus`, new column on `OrderFulfilmentGroup`)

```
AWAITING_BRAND ──► READY_FOR_PICKUP ──► PICKED_UP ──► AT_HUB ──► IN_PARCEL
      │                   │                 │            │
      └───────────────────┴─────────────────┴────────────┴──► CANCELLED
```

- `AWAITING_BRAND` — order placed, the brand is packing.
- `READY_FOR_PICKUP` — the brand pressed "Ready for pickup". The pickup is placed in a round.
- `PICKED_UP` — our rider scanned the brand's pickup code and tagged the bag.
- `AT_HUB` — hub staff scanned the bag tag and counted the units.
- `IN_PARCEL` — packed into a `Shipment`. **From here the pickup has no status of its own; it
  shows its parcel's status** (5.5).
- `CANCELLED` — every line in the pickup was refunded or cancelled before it reached a parcel.

Pickups coming back through the hub use `RETURN_AT_HUB → RETURNING_TO_BRAND → RETURNED_TO_BRAND`
(section 12).

### 5.2 Parcel status (`ShipmentStatus`, on the new `Shipment`)

```
PACKED ──► HANDED_TO_PARTNER ──► IN_TRANSIT ──► OUT_FOR_DELIVERY ──► DELIVERED
   │                                   ▲              │
   │                                   └── DELIVERY_FAILED (attempt n)
   │                                                  │
   │                                                  ▼
   │                                   RETURNING ──► RETURNED_TO_HUB
   ▼
CANCELLED                                   LOST (from any status after handover)
```

Allowed moves are a fixed map in code (`SHIPMENT_STATUS_NEXT`), unit-tested against every pair:

- A partner may **skip forward** (straight from `HANDED_TO_PARTNER` to `DELIVERED` is accepted),
  because partners don't always report every step.
- `DELIVERY_FAILED → OUT_FOR_DELIVERY` is the only loop (a retry attempt).
  `Shipment.deliveryAttemptCount` counts the attempts.
- `DELIVERED`, `RETURNED_TO_HUB`, `CANCELLED` and `LOST` are final. Only an admin correction
  (8.3) can move a parcel out of one of them.
- An event that would move backwards, or that happened earlier than the event that set the
  current status, is **stored but does not change the status** (`appliedToStatus = false`). This
  is how out-of-order webhooks stay harmless.

### 5.3 Order rollup (existing fields, kept)

`Order.fulfilmentStatus` and `Order.fulfilmentSummary` stay, still written only by
`setOrderFulfilmentRollup`, so every existing filter, badge, commission sweep and payout sweep
keeps working. The new detailed statuses map onto them:

| Detailed state                                                           | `FulfilmentStatus` (coarse) |
| ------------------------------------------------------------------------ | --------------------------- |
| `AWAITING_BRAND`                                                         | `PLACED`                    |
| `READY_FOR_PICKUP`, `PICKED_UP`, `AT_HUB`, parcel `PACKED`               | `PACKED`                    |
| `HANDED_TO_PARTNER`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERY_FAILED` | `SHIPPED`                   |
| `DELIVERED`                                                              | `DELIVERED`                 |
| `RETURNING`, `RETURNED_TO_HUB`                                           | `RETURNED`                  |
| `CANCELLED`                                                              | `CANCELLED`                 |

`OrderFulfilmentGroup.status` (the existing coarse column) is written with the same mapping in
the same transaction, so brand filters keep working. Both coarse columns are only ever written by
the one function that writes the detailed status, so they can't drift apart.

### 5.4 What the customer sees (`OrderTrackingStage`)

The API returns a **stage code**, never English text. The web app turns the code into words, so a
new language is a translation file, not an API change (section 16).

| Stage code                | English label                                   | When                                                                                       |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `ORDER_PLACED`            | Order placed                                    | Any pickup still `AWAITING_BRAND`                                                          |
| `COLLECTING_ITEMS`        | Collecting your items (2 of 3 brands collected) | Some pickups collected, no parcel yet. Includes `collectedBrandCount` / `totalBrandCount`. |
| `AT_HUB`                  | At the Outfiqe hub                              | Every live pickup `AT_HUB`, not packed yet                                                 |
| `PACKED`                  | Packed                                          | Parcel `PACKED`                                                                            |
| `ON_ITS_WAY`              | On its way                                      | `HANDED_TO_PARTNER` / `IN_TRANSIT`                                                         |
| `OUT_FOR_DELIVERY`        | Out for delivery                                | `OUT_FOR_DELIVERY`                                                                         |
| `DELIVERY_ATTEMPT_FAILED` | Delivery attempt failed — we'll try again       | `DELIVERY_FAILED`                                                                          |
| `DELIVERED`               | Delivered                                       | `DELIVERED`                                                                                |
| `RETURNING`               | Returning to us                                 | `RETURNING` / `RETURNED_TO_HUB`                                                            |
| `CANCELLED`               | Cancelled                                       | `CANCELLED`                                                                                |

Every order also shows the **delivery promise** (section 14) next to its stage.

### 5.5 Keeping statuses clean when brands' items are combined

1. **Every event is recorded against the thing it physically happened to.** "Rider picked up
   from Brand A" goes on Brand A's pickup. "Out for delivery" goes on the parcel. A status is
   never copied onto several rows.
2. **A pickup in a parcel shows the parcel's status.** Once `IN_PARCEL`, a pickup's effective
   status is its parcel's status, read through `OrderFulfilmentGroup.shipmentId`. When the
   parcel is delivered, every brand in it is delivered by that one event, and their payouts
   start maturing from the same moment.
3. **The hub packs a parcel only from pickups that are ready.** Packing is allowed when every
   hub-flow pickup in the order is `AT_HUB` or `CANCELLED`. If one brand misses its round and
   the others are waiting past the time limit (section 14), an admin with `logisticsManage` can
   pack the pickups already at the hub. The late brand's items then go in a second parcel. A
   pickup links to exactly one parcel (a single foreign key), so an order with two parcels needs
   no special code. The order counts as `DELIVERED` only when every parcel is delivered, using the
   same `deriveOrderFulfilment` rule that handles multi-brand orders today.
4. **Returns split back per brand.** A returned parcel is checked in at the hub as one unit. Each
   pickup inside it is then inspected and sent back to its own brand separately (section 12).

## 6. Which flow an order uses

The flow is decided **per brand pickup, at checkout**, and snapshotted on
`OrderFulfilmentGroup.fulfilmentMode`, so it never changes for an order already placed. A group is
`OUTFIQE_LOGISTICS` when all of these hold:

1. The `order_logistics` feature flag is on for the brand (`EVERYONE`, or the brand is on its allow-list).
2. The brand has an active default `BrandPickupLocation` in a zone an active hub collects from
   (`HubPickupZone`).
3. The delivery city's zone is covered from that hub by an active partner (`DeliveryPartnerZone`
   rows for that hub).
4. If the order is COD, the covering partner supports COD.

Otherwise the group is `BRAND_SHIPS` and runs today's flow unchanged: the brand ships it and enters
the carrier and tracking number.

- **Mixed orders are normal.** A valley brand and a Pokhara brand in one cart give one hub group
  and one brand-shipped group. The customer sees one track for the parcel and one for the
  brand's own shipment. The order rollup already handles independent groups.
- **Brands without a pickup location** stay `BRAND_SHIPS`. The brand dashboard asks every brand to
  add one. Valley brands are onboarded to it before the switch is turned on.

**Pickup locations are new.** Before this, no table stored a brand's address. `Brand`,
`BrandApplication` and `Organization` held only a contact name, email, phone and Instagram. So:

- The brand dashboard gets a **Pickup location** page:
  - address, landmark, contact person and phone, an optional map pin, an opening-hours note
  - the city, picked from the same delivery-zone city search shoppers use (`GET
/delivery-zones/cities`), so coverage needs no second list of areas
- Saving checks coverage:
  - Inside a hub pickup zone: "Outfiqe will collect your orders from here."
  - Outside: "Outfiqe pickup isn't available in your area yet. You'll keep shipping orders
    yourself." The location is still saved.
- A dashboard banner stays until a location exists.
- The brand **apply** form also asks for the city, so we know from day one whether a new brand is
  inside a covered area.

## 7. Data model

### 7.1 Changed

| Table                  | Change                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Order`                | `+ countryCode` (ISO 3166-1, e.g. `NP`), `+ currency` (ISO 4217, e.g. `NPR`), both snapshotted at checkout. `+ phoneE164` (normalised from the entered phone and country). `+ region?`, `+ postalCode?` (Nepal doesn't use postcodes; other countries' partners require them). `+ promisedDeliveryFrom`, `+ promisedDeliveryBy` (section 14). `+ refundedAmount Int @default(0)`, check `refundedAmount <= total`. |
| `OrderFulfilmentGroup` | `+ fulfilmentMode (BRAND_SHIPS \| OUTFIQE_LOGISTICS)`. `+ pickupLocationId?`, `+ hubId?` (snapshotted). `+ pickupStatus`. `+ pickupCode` (unique, 8 characters, no confusable letters). `+ shipmentId?`. `+ readyForPickupAt, pickedUpAt, atHubAt`. `carrier`/`trackingNumber` stay, used only by `BRAND_SHIPS` groups.                                                                                            |
| `OrderItem`            | `+ refundedQty Int @default(0)`, check `refundedQty BETWEEN 0 AND qty`. `+ inspectionStatus (NOT_INSPECTED \| PASSED \| FAILED)`, `+ failedQty`.                                                                                                                                                                                                                                                                   |
| `PaymentStatus`        | `+ PARTIALLY_REFUNDED`. COD orders also move `DUE → PAID` when the partner reports the cash collected. Today nothing ever moves a COD order out of `DUE`.                                                                                                                                                                                                                                                          |
| `CouponRedemption`     | `+ releasedAmount Int @default(0)`, coupon budget given back by partial refunds (11.5).                                                                                                                                                                                                                                                                                                                            |
| `DeliveryZone`         | `+ countryCode`. `+ minDeliveryDays`, `+ maxDeliveryDays` (working days, for the delivery promise). The unique key on `DeliveryZoneCity` becomes `(countryCode, cityNormalized)`, because city names repeat across countries.                                                                                                                                                                                      |
| `UserRole`             | `+ RIDER`.                                                                                                                                                                                                                                                                                                                                                                                                         |

### 7.2 New

| Table                      | Key fields                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BrandPickupLocation`      | `brandId, label, contactName, contactPhoneE164, address, city, deliveryZoneId, countryCode, latitude?, longitude?, openingNote?, isDefault, isActive`. A partial unique index allows one active default per brand. Brands manage it in their dashboard; a change applies to new orders only (groups keep their snapshot).                                                                                                                                                                                                                                                   |
| `Hub`                      | `id, name, countryCode, address, city, phoneE164, timeZone` (IANA), `workingDays, openTime, closeTime, pickupRoundTimes, readyCutoffMinutes, partnerCollectionTime, isActive`. One row at launch.                                                                                                                                                                                                                                                                                                                                                                           |
| `HubPickupZone`            | `hubId, deliveryZoneId`, unique together. Which areas the hub's riders collect from.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `BagTag`                   | `code` (unique, pre-printed), `batchId, fulfilmentGroupId?, attachedAt?, attachedByRiderId?`. Generated in batches in admin, printed as sticker rolls. One tag is attached once.                                                                                                                                                                                                                                                                                                                                                                                            |
| `Shipment`                 | `id, orderId, hubId, trackingCode` (unique, customer-facing, e.g. `OFQ-7K2M9Q`), `status, currency, codAmountToCollect, codCollectedAmount?, weightGrams, parcelCount, labelUrl?` (our own label), `deliveryAttemptCount, lastEventAt, deliveredAt?, partnerClaimAmount?, partnerClaimStatus?`. Indexes `(status, lastEventAt)`, `(orderId)`. **No partner IDs live here** — they live on `ShipmentPartnerBooking`.                                                                                                                                                         |
| `ShipmentPartnerBooking`   | `id, shipmentId, partnerId, partnerAccountId, partnerReference?` (the partner's own ID, set once booked), `status (REQUESTED \| BOOKED \| BOOKING_FAILED \| CANCELLED)`, `connection (API \| MANUAL)`, `partnerLabelUrl?, partnerTrackingUrl?, partnerFee?, requestedAt, bookedAt?, cancelledAt?, cancelReason?`. Unique `(partnerId, partnerReference)`. A partial unique index on `shipmentId` where `status <> CANCELLED` allows **one live booking per parcel**. Rebooking cancels the old row and adds a new one, so the history is kept. Index `(partnerId, status)`. |
| `DeliveryPartnerAccount`   | `id, partnerId, hubId, merchantAccountRef` (our account number with the partner), `pickupPointRef?` (the partner's ID for our hub as a pickup point), `credentialsKey` (the env-var prefix holding this account's secrets), `isActive`. Unique `(partnerId, hubId)`. One partner can give us a different account or pickup point per hub or country.                                                                                                                                                                                                                        |
| `TrackingEvent`            | Append-only. `id`, then `fulfilmentGroupId?` or `shipmentId?` (check constraint: exactly one set). `code` (`TrackingEventCode`), `source (BRAND \| RIDER \| HUB \| PARTNER_WEBHOOK \| PARTNER_POLL \| PARTNER_IMPORT \| ADMIN \| SYSTEM)`, `actorUserId?, partnerId?, rawStatus?, rawPayload Json?, reasonCode?, location?, note?, occurredAt, receivedAt, appliedToStatus, dedupeKey`. Unique `(source, partnerId, dedupeKey)`. Indexes `(shipmentId, occurredAt)`, `(fulfilmentGroupId, occurredAt)`.                                                                     |
| `DeliveryPartner`          | `id, code` (unique), `name, countryCode, adapterKey, isActive, supportsBooking, supportsWebhooks, supportsPolling, supportsCod, supportsCodAmountUpdate, supportsCancel, webhookVerification (SIGNATURE \| HEADER_TOKEN \| NOTIFY_THEN_FETCH \| NONE), referencePattern?, codRemittanceDays, trackingUrlTemplate?`. **Credentials are never stored here** (9.3).                                                                                                                                                                                                            |
| `DeliveryPartnerZone`      | `partnerId, hubId, deliveryZoneId, priority, isActive`. Unique `(partnerId, hubId, deliveryZoneId)`. "From this hub, this partner delivers to this zone."                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `DeliveryPartnerStatusMap` | `partnerId, rawStatus` (normalised), `canonicalCode, reasonCode?`. Unique `(partnerId, rawStatus)`. Editable in admin.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `PartnerWebhookReceipt`    | `id, partnerId, receivedAt, rawBody, signatureValid, processedAt?, processingError?`. The untouched raw input, kept for audit and replay.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Rider`                    | `userId` (unique), `hubId, employmentType (EMPLOYEE \| CONTRACTOR)`, `status (INVITED \| ACTIVE \| SUSPENDED \| OFFBOARDED)`, `phoneE164, vehicleType, vehicleNumber, identityVerifiedAt?, identityVerifiedById?`.                                                                                                                                                                                                                                                                                                                                                          |
| `RiderZone`                | `riderId, deliveryZoneId`, unique together.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `RiderTask`                | `id, riderId, hubId, type (PICKUP_ROUND_VISIT)`, `brandId, pickupLocationId, roundStartsAt, status (ASSIGNED \| IN_PROGRESS \| COMPLETED \| WASTED \| CANCELLED)`, `assignedById, assignedAt, completedAt?, wastedReason?`. One task is one visit to one brand location, collecting and returning in the same trip.                                                                                                                                                                                                                                                         |
| `RiderTaskStop`            | `riderTaskId, fulfilmentGroupId, direction (COLLECT \| RETURN)`, `scannedAt?`. A partial unique index on `(fulfilmentGroupId, direction)` while the task is active means a pickup can never be on two live tasks.                                                                                                                                                                                                                                                                                                                                                           |
| `RiderPayRate`             | `countryCode, currency, employmentType, visitAmount, extraStopAmount, wastedVisitAmount, effectiveFrom, isActive`. Snapshotted onto earnings.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `RiderEarning`             | `riderId, riderTaskId` (unique), `currency, amount, stopCount, status (PENDING \| AVAILABLE \| WITHDRAWN \| VOIDED)`, plus the rate snapshot. Contractors only.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `CustomerDeliveryRefusal`  | `shipmentId` (unique), `userId, phoneE164, countryCode, reasonCode, createdAt`. Indexes `(userId, createdAt)`, `(phoneE164, createdAt)`. Feeds the COD rule (12.2).                                                                                                                                                                                                                                                                                                                                                                                                         |
| `BrandFulfilmentIncident`  | `brandId, fulfilmentGroupId?, riderTaskId?, type (UNAVAILABLE_ITEM \| FAILED_INSPECTION \| WASTED_VISIT \| MISSED_ROUND)`, `createdAt`. Index `(brandId, createdAt)`.                                                                                                                                                                                                                                                                                                                                                                                                       |
| `OrderRefund`              | `id, orderId, currency, reasonCode, note?, initiatedByType (ADMIN \| BUYER \| SYSTEM), initiatedById?, causedBy (PLATFORM \| BRAND \| BUYER \| PARTNER)`, `goodsAmount, couponShareAmount, deliveryFeeAmount, codFeeAmount, amount`, `method (GATEWAY \| MANUAL \| COD_REDUCTION)`, `status (PENDING \| SUCCEEDED \| NEEDS_MANUAL \| RECORDED)`, `paymentTransactionId?`, `idempotencyKey` (unique per order).                                                                                                                                                              |
| `OrderRefundLine`          | `refundId, orderItemId, qty, goodsAmount, couponShare, amount, payoutBefore Json, payoutAfter Json`. The before/after snapshot gives a full audit trail of every ledger row that was recomputed.                                                                                                                                                                                                                                                                                                                                                                            |
| `CodRemittance`            | `id, partnerId, currency, partnerReference?, periodStart, periodEnd, amountReceived, receivedAt, recordedById`.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `CodRemittanceLine`        | `remittanceId, shipmentId` (unique), `collectedAmount, partnerFee, netAmount`. Each parcel's cash can be settled only once.                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `LogisticsAlert`           | `id, alertType, fulfilmentGroupId?, shipmentId?, raisedAt, resolvedAt?`. Unique `(alertType, fulfilmentGroupId, shipmentId)`, so an alert fires once per stage per subject.                                                                                                                                                                                                                                                                                                                                                                                                 |

### 7.3 Tracking event codes (`TrackingEventCode`)

These are every status code in 5.1 and 5.2, **plus** events that don't change a status:
`ROUND_ASSIGNED`, `RIDER_ASSIGNED`, `BAG_TAGGED`, `VISIT_WASTED`, `COUNT_MISMATCH`,
`INSPECTION_RECORDED`, `BOOKING_REQUESTED`, `BOOKING_CONFIRMED`, `BOOKING_FAILED`,
`COD_AMOUNT_CHANGED`, `DELIVERY_RESCHEDULED`, `UNKNOWN_PARTNER_STATUS`, `HANDOVER_NOT_SCANNED`,
`DELIVERY_DISPUTED`, `ADMIN_CORRECTION`, `NOTE`.

Failure and refusal reasons are codes too (`DeliveryFailureReason`: `CUSTOMER_UNREACHABLE`,
`CUSTOMER_REFUSED`, `WRONG_ADDRESS`, `RESCHEDULED_BY_CUSTOMER`, `WRONG_OR_DAMAGED_ITEM`,
`PARTNER_ISSUE`, `OTHER`), so every rule and report can rely on them.

## 8. The tracking event log

Every fact about a pickup or parcel, from any source, is one `TrackingEvent`. Current statuses
are a cache of the log, written in the **same transaction** as the event that changed them.

### 8.1 One write path

All sources call `logisticsTrackingService.recordEvent(event)`:

1. Insert the event. On a `dedupeKey` conflict, return the existing event (an idempotent replay
   changes nothing).
2. Check the move against the allowed-moves map and the `occurredAt` ordering rule (5.2). Set
   `appliedToStatus`.
3. If applied, update the pickup or parcel status and its timestamp, guarded by the status it is
   leaving (`updateMany ... where status = <current>`). Losing that race re-reads and re-checks
   once.
4. Recompute the order rollup through `setOrderFulfilmentRollup`. That still stamps
   `Order.deliveredAt` exactly once.
5. After commit, publish `ORDER_STATUS_CHANGED` **only when the customer-facing stage changed**,
   so internal steps don't spam the customer.

### 8.2 Dedupe keys

| Source                          | `dedupeKey`                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Partner webhook / poll / import | The partner's own event id, or `sha256(partnerReference + rawStatus + occurredAt)` when it has none |
| Rider and hub scans             | A client-generated idempotency key, so an offline scan synced twice counts once                     |
| Brand, admin, system            | A server-generated key per action                                                                   |

### 8.3 Admin corrections

An admin can move a pickup or parcel to any status, with a required reason. This writes an
`ADMIN_CORRECTION` event plus a `PlatformAuditLog` entry (`logistics.status-corrected`). It is
the only way out of a final status. The original events are never edited or deleted.

## 9. Delivery partners — one contract for all

The rule: **our IDs, our statuses and our event shape are the only truth. A partner's order
number is just an external reference on a `ShipmentPartnerBooking`.** Adding a partner, in any
country, means writing one adapter and filling in its status map. Order, refund, payout and UI
code never changes. **Partners don't build anything for us:** we fit their existing system, never
the other way round.

**Who's who.** The **hub** is ours: Outfiqe's own warehouse, run by Outfiqe employees. A
**delivery partner** is an outside courier company with its own riders and its own system. Our
riders carry items brand → hub, and partner riders carry parcels hub → customer. Our riders never
deliver to customers, and partner riders never visit brands.

### 9.1 Partner onboarding (once per partner)

| Step                              | What happens                                                                                                                                                   | What we store                                                |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Agreement                         | Rates, cash-on-delivery terms, how often collected cash is paid to us                                                                                          | `DeliveryPartner` (capabilities, `codRemittanceDays`)        |
| Merchant account                  | The partner opens a business account for Outfiqe. This is how their system knows a parcel is ours.                                                             | `DeliveryPartnerAccount.merchantAccountRef`                  |
| Pickup point                      | Our hub is registered as the pickup address in that account                                                                                                    | `DeliveryPartnerAccount.pickupPointRef`                      |
| API access, if they have one      | Test credentials first, then live                                                                                                                              | Secrets in env under the account's `credentialsKey`          |
| Updates, if they support webhooks | **We generate** their webhook address and a webhook secret and send both privately. They paste them into their dashboard, test on their sandbox, then go live. | Webhook secret in env; `DeliveryPartner.webhookVerification` |
| Coverage                          | The cities they deliver to from our hub                                                                                                                        | `DeliveryPartnerZone` rows                                   |
| Status names                      | Their status words mapped to ours                                                                                                                              | `DeliveryPartnerStatusMap` rows                              |
| COD payouts                       | Our bank account for the cash they collect                                                                                                                     | Nothing in Outfiqe (contract only)                           |

### 9.2 How our IDs link to the partner's

```
ORDER    ORD-1001                    one customer, one checkout
 ├── PICKUP  Brand A (2 items)       bag tag BT-4410
 ├── PICKUP  Brand B (1 item)        bag tag BT-4411
 └── PICKUP  Brand C (1 item)        bag tag BT-4412
          │  packed together at the hub
          ▼
PARCEL   OFQ-7K2M9Q                  our tracking code, on our label
          │  booked under our merchant account
          ▼
BOOKING  Partner X → PX-55821        the partner's own ID
```

- **The partner only ever sees the parcel.** One parcel is one booking with them. Which brands
  and items are inside is never sent.
- **We always send our parcel code** in the partner's "merchant reference" field (every courier
  form or API has one). The partner's system stores `OFQ-7K2M9Q` against its own `PX-55821`, so
  both sides hold both IDs. Their staff can find our parcel by our code too.
- **The partner's ID is stored only on the booking**, never on the order, pickup or items.
- **Every update is matched by either ID:** first by `(partner, partnerReference)`, then by the
  merchant reference (our tracking code) for that partner. A match on a `CANCELLED` booking is
  stored but never applied, because that partner no longer holds the parcel. No match at all
  leaves the receipt flagged `UNMATCHED_REFERENCE` and raises an alert. Nothing is guessed.
- **An update flows down the chain:** booking → parcel → every pickup in it → every item → the
  order. One "delivered" update from the partner updates the customer, all brands, payouts and
  commissions together.

| Case                                         | What happens to the IDs                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Late brand, order goes in two parcels        | Two parcels, each with its own booking. The order is delivered only when both are.                                    |
| Partner doesn't collect, rebook with another | Old booking `CANCELLED`, new booking on the **same parcel** with the new partner's ID. The parcel code never changes. |
| Parcel returned                              | It comes back under the same booking. The hub scans `OFQ-7K2M9Q` and splits it back into pickups.                     |
| Duplicate or late update                     | Stored once (8.2). Can't move the parcel backwards (5.2).                                                             |

**Who calls whom:**

| Direction                  | How                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Booking: Outfiqe → partner | We call **their** API in **their** format, signed in with our merchant account. Without an API, hub staff book on the partner's website and type the partner's ID back into Outfiqe.                   |
| Updates: partner → Outfiqe | Their webhook posts to our address in **their own format**, and our adapter translates it. Without webhooks, we poll their API. Without an API, ops upload their daily sheet or enter updates by hand. |

### 9.3 Credentials

There are two keys, one for each direction:

| Key             | Who issues it | Who uses it | For                                                      |
| --------------- | ------------- | ----------- | -------------------------------------------------------- |
| Partner API key | The partner   | Outfiqe     | Booking, cancelling and polling in **their** system      |
| Webhook secret  | Outfiqe       | The partner | Proving that updates sent into **our** system are theirs |

Both stay in env config under each account's `credentialsKey`
(`DELIVERY_PARTNER_<KEY>_API_KEY` / `_WEBHOOK_SECRET`, plus `_WEBHOOK_SECRET_PREVIOUS` during a
rotation, so updates signed with either secret are accepted until the partner has switched).
`env.config.ts` validates them at boot for every active account that needs them. They are never
stored in the DB, returned by an API or shown in admin. A suspected leak means a new secret is
issued and the old one is removed after the switch.

### 9.4 Adapter interface

```ts
type CreateDeliveryPartnerAdapter = (
  account: DeliveryPartnerAccountConfig,
) => DeliveryPartnerAdapter;

type DeliveryPartnerAdapter = {
  createShipment(request: PartnerBookingRequest): Promise<PartnerBookingResult>;
  cancelShipment?(partnerReference: string): Promise<void>;
  updateCodAmount?(partnerReference: string, codAmount: number): Promise<void>;
  fetchTrackingEvents?(partnerReference: string, since: Date): Promise<PartnerTrackingEvent[]>;
  verifyWebhook?(headers: Record<string, string>, rawBody: Buffer): boolean;
  parseWebhook?(rawBody: Buffer): PartnerTrackingEvent[];
};

type PartnerAddress = {
  line1: string;
  landmark: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
};

type PartnerBookingRequest = {
  merchantReference: string;
  idempotencyKey: string;
  pickup: { name: string; phoneE164: string; address: PartnerAddress };
  recipient: { fullName: string; phoneE164: string; address: PartnerAddress };
  currency: string;
  codAmount: number;
  declaredValue: number;
  weightGrams: number;
  parcelCount: number;
  contentsDescription: string;
};

type PartnerBookingResult = {
  partnerReference: string;
  labelUrl: string | null;
  partnerTrackingUrl: string | null;
};

type PartnerTrackingEvent = {
  partnerReference: string | null;
  merchantReference: string | null;
  partnerEventId: string | null;
  rawStatus: string;
  occurredAt: Date;
  location: string | null;
  rawReason: string | null;
  codCollectedAmount: number | null;
  rawPayload: unknown;
};
```

- `merchantReference` is always our parcel code (`Shipment.trackingCode`), so both systems hold
  both IDs (9.2). If a partner refuses a reference it has seen before (a rebook with the same
  partner), the adapter adds a suffix (`OFQ-7K2M9Q-2`), and matching strips it.
- `idempotencyKey` is the `ShipmentPartnerBooking.id`, so a partner that supports idempotent
  booking can never book the same parcel twice.
- An adapter is created per `DeliveryPartnerAccount`, so each hub's merchant account and pickup
  point are used automatically.
- Phone numbers go out in E.164 and times as UTC `Date`s. Adapters convert to whatever the partner
  expects.
- Adapters are registered in `logistics/partners/partner-adapter.registry.ts` by `adapterKey`.
- Each adapter has unit tests against recorded sample payloads from that partner.

### 9.5 The manual adapter — every partner works from day one

`MANUAL` is a real adapter with no API calls. **Launch runs on it**, while partner API
integrations are signed up one by one:

- **Booking:** the parcel shows in the hub's "Book with partner" queue, with our parcel code
  shown large and a copy button. Staff book in the partner's own portal under our merchant
  account, typing our code into its reference field, then enter the partner's ID in Outfiqe. That
  creates a `ShipmentPartnerBooking` with `connection = MANUAL, status = BOOKED`.
- **Updates:** staff record status changes from the admin parcel page. These are `ADMIN` events
  carrying the partner's raw status text.
- **Spreadsheet import:** many partners send daily status sheets. `POST
/logistics/admin/partners/:partnerId/status-imports` accepts a CSV of `partnerReference` and/or
  `merchantReference`, `rawStatus, occurredAt, rawReason, codCollectedAmount`, matched as in 9.2.
  Each row becomes a `PARTNER_IMPORT`
  event through the same `recordEvent` path, deduped by the 8.2 hash. One bad row is reported
  back and does not block the others.

A partner with an API later just swaps `adapterKey`. Nothing else changes.

### 9.6 Updates coming in

```
POST /webhooks/delivery-partners/:partnerCode
  → rate limit + body size limit, raw body kept for signature checking
  → unknown or inactive partner: 404
  → verifyWebhook fails: store receipt (signatureValid = false), 401, nothing applied
  → store PartnerWebhookReceipt, publish LOGISTICS_PARTNER_WEBHOOK_RECEIVED to Redis Streams, 200
  → consumer: parseWebhook → find the booking (9.2) → map each rawStatus via
    DeliveryPartnerStatusMap → recordEvent on the booking's parcel
```

- We reply `200` as soon as the receipt is stored, so a slow consumer never makes the partner
  retry. Retrying, reclaiming stuck messages and the dead-letter stream come from the existing
  Redis Streams setup (`apps/api/src/shared/redis`).
- A raw status with no mapping is stored as `UNKNOWN_PARTNER_STATUS` with the raw text, and
  raises a `LogisticsAlert`. It is never dropped. Once an admin adds the mapping, "Replay" re-runs
  that partner's unmapped receipts.
- **Polling** for partners without webhooks: a scheduled job in `src/jobs/` calls
  `fetchTrackingEvents` every 15 minutes for that partner's parcels that aren't final, oldest
  `lastEventAt` first, in pages. Results go through the same consumer path.
- **Safety net for webhook partners:** the same job polls any parcel with no update in 24 hours,
  so a webhook missed while our server was down is still caught.
- **Proving an update is genuine** (`DeliveryPartner.webhookVerification`). We use whatever the
  partner supports, strongest first:
  - `SIGNATURE` — an HMAC of the raw body with the webhook secret.
  - `HEADER_TOKEN` — the secret sent in a header, compared in constant time.
  - `NOTIFY_THEN_FETCH` — for partners with no webhook security. The webhook is only a "something
    changed" signal, and the real status is fetched from the partner's API, so a forged request
    can't change anything.

### 9.7 Bookings going out

- Packing a parcel commits the `Shipment` and a `REQUESTED` `ShipmentPartnerBooking` for the
  chosen partner first, then publishes `LOGISTICS_SHIPMENT_PACKED` after the commit. No partner
  call ever happens inside a database transaction.
- For an API partner, the consumer calls `createShipment` and stores `partnerReference`,
  `partnerLabelUrl` and `partnerTrackingUrl` on the booking (`BOOKED`).
- When retries run out, the message goes to the dead-letter stream and the booking is marked
  `BOOKING_FAILED` with an ops alert. From there ops can retry it or rebook manually.
- **A sweep job** re-publishes bookings stuck in `REQUESTED` for longer than 10 minutes, in case
  the post-commit publish was lost. Before any re-send, the adapter looks the parcel up with the
  partner by our merchant reference, because re-booking blind could create a duplicate.

### 9.8 Choosing and changing the partner

The default is the highest-priority active partner in `DeliveryPartnerZone` for this hub and the
delivery city's zone. COD orders only consider partners with `supportsCod`. Hub staff can override
the choice before booking.

Changing partner after booking (`POST /logistics/hub/shipments/:shipmentId/rebook`) does three
things in order:

1. Cancels with the old partner, through `cancelShipment` or an ops confirmation for manual
   partners.
2. Marks the old booking `CANCELLED` with a reason.
3. Creates a new booking on the same parcel.

The parcel code, label and tracking history all stay.

### 9.9 The three connection levels

| Level                    | Booking                                                                                                            | Updates                                                                                                | Typing needed            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------ |
| **1. API + webhooks**    | Outfiqe server calls their API on "Pack"                                                                           | Their system calls our webhook on every change                                                         | None, only scans         |
| **2. API, no webhooks**  | Same as level 1                                                                                                    | Outfiqe server polls their API every 15 minutes                                                        | None, only scans         |
| **3. No API** (`MANUAL`) | Hub staff book on the partner's website, pasting our code as the reference, and type the partner's ID into Outfiqe | Ops upload the partner's daily spreadsheet, or pick updates from a list when told by phone or WhatsApp | Booking ID, plus updates |

All three produce the same `TrackingEvent`s, so customers, brands, reports and payouts can't tell
them apart. Realistically, most partners start at level 3 and move up as they give us API access.
Moving up is a change to `adapterKey`.

### 9.10 Edge cases between the hub and partners

| Area     | What goes wrong                                                                        | What the system does                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Booking  | Partner API down or slow                                                               | Retries, then `BOOKING_FAILED` with an alert. Ops book manually, retry later or rebook with another partner.                                                                                                                                            |
| Booking  | Our call timed out but the partner created the order                                   | The partner is checked by our merchant reference before any retry. Never booked twice.                                                                                                                                                                  |
| Booking  | Address or city not covered, or the phone number is rejected                           | Fails with the partner's reason. Ops pick another partner or fix the details with the customer. Phones are validated at checkout and formatted per partner by the adapter.                                                                              |
| Booking  | Wrong partner ID typed (manual)                                                        | Checked against `DeliveryPartner.referencePattern` and the unique `(partnerId, partnerReference)` constraint. The partner's first update must match our merchant reference, or an alert is raised.                                                      |
| Booking  | Partner ID never entered                                                               | The handover scan is **blocked** until the parcel has a `BOOKED` booking.                                                                                                                                                                               |
| Booking  | The partner needs its own label                                                        | We print the partner's label (from `partnerLabelUrl`) alongside ours, or write their ID on ours.                                                                                                                                                        |
| Handover | Order cancelled after booking, before handover                                         | `cancelShipment` (or by hand), booking `CANCELLED`, parcel unpacked, and items restocked or returned to the brand.                                                                                                                                      |
| Handover | COD amount changed after booking                                                       | `updateCodAmount`, or an ops task. The handover scan blocks on a label mismatch (11.4).                                                                                                                                                                 |
| Handover | Partner didn't come                                                                    | "Partner hasn't collected" alert. Ops wait or rebook.                                                                                                                                                                                                   |
| Handover | Partner took fewer parcels                                                             | Only scanned parcels become `HANDED_TO_PARTNER`. The rest stay `PACKED`, with an alert.                                                                                                                                                                 |
| Handover | Parcel left without our scan                                                           | The partner's first update is accepted (skipping forward), with a `HANDOVER_NOT_SCANNED` alert.                                                                                                                                                         |
| Updates  | Duplicate, out of order, unknown status, renamed status                                | Stored once (8.2), never backwards (5.2), `UNKNOWN_PARTNER_STATUS` with replay (9.6).                                                                                                                                                                   |
| Updates  | Forged webhook                                                                         | Fails verification, stored for audit, never applied.                                                                                                                                                                                                    |
| Updates  | Our server down when the partner sent it                                               | The partner's retries, plus the 24-hour safety-net poll.                                                                                                                                                                                                |
| Updates  | Partner re-created the order with a new ID                                             | Matched by our merchant reference. Ops confirm the replacement ID on the booking, and it is audit-logged.                                                                                                                                               |
| Updates  | Partner silent                                                                         | "No partner update" alert after 2 working days. Ops chase, and can mark the parcel `LOST` (12.4).                                                                                                                                                       |
| Updates  | Spreadsheet re-uploaded, stale rows, unknown IDs                                       | Deduped, never backwards, unknown rows reported per row while the rest apply.                                                                                                                                                                           |
| Delivery | "Delivered" but the customer says not received                                         | The customer reports it within 3 days (`POST /orders/:orderId/delivery-disputes`). This records a `DELIVERY_DISPUTED` event with an alert. Ops request proof from the partner. Without proof, a full refund (`causedBy = PARTNER`) and a partner claim. |
| Delivery | Cash collected doesn't match, or no amount sent                                        | Alert on mismatch. A missing amount is treated as the full amount due and confirmed against the remittance statement.                                                                                                                                   |
| Delivery | Customer changes address or time                                                       | Through ops, then the partner (API where supported, otherwise by hand), recorded as an event.                                                                                                                                                           |
| Delivery | Partner returns the parcel to the brand, not our hub                                   | A breach of the agreement. The brand confirms receipt and ops close the return.                                                                                                                                                                         |
| Cash     | Short payment, unexpected parcel on the statement, fee off the rate card, late payment | The per-parcel remittance comparison flags each one (section 13).                                                                                                                                                                                       |
| Partner  | Partner stops operating or is suspended                                                | Set inactive. New parcels go to the next partner, and ops get a list of that partner's open parcels.                                                                                                                                                    |
| Customer | The partner has a public tracking page                                                 | The customer sees its link (`partnerTrackingUrl`) next to our timeline.                                                                                                                                                                                 |

## 10. Riders

### 10.1 Accounts

- Riders are `User`s with role `RIDER` and a `Rider` profile tied to a hub. They are **only
  created by admin invite** (`logisticsManage` permission) and cannot sign up themselves. They
  log in through the same auth path and session type as everyone else (short-lived JWT plus
  rotating refresh token), with the same rate limiting and lockout.
- `employmentType` is `EMPLOYEE` or `CONTRACTOR`. Contractors must have their identity verified
  **in person** by an admin before they can be set `ACTIVE`. The admin sees the citizenship
  certificate or driving licence and records only:
  - the document type,
  - its last 4 digits,
  - who checked it, and when.

  No document images are stored. That keeps sensitive data out of Outfiqe, and needs no private
  file storage, which the platform doesn't have.

- `SUSPENDED` or `OFFBOARDED` riders are logged out everywhere (refresh tokens revoked), and
  their open tasks go back to the pickup board.

### 10.2 The rider app

A `rider` feature in `apps/web` at `/rider`, visible only to the `RIDER` role. The web app is
already an installable PWA, so riders get a home-screen app with camera QR scanning:

- **Today's visits:** brand name, pickup location with a map link, the brand contact's phone,
  what to collect and what to return.
- **Typed code** as a fallback whenever the camera can't read a QR.
- **Offline:** scans are queued on the device with their idempotency key and the device time,
  then synced. The server accepts a device `occurredAt` only if it is not in the future and not
  more than 24 hours old, and always records its own `receivedAt` alongside.

### 10.3 Rounds and tasks

- The **pickup board** lists the next round's ready pickups, grouped by brand location and zone.
  Return stops (items going back to that brand) are added to the same visit automatically.
- Ops assign one `RiderTask` per brand visit. A rider's round is their list of tasks.
- **At the brand,** the rider scans each pickup code, then a fresh bag tag for each bag. The server
  checks that the code belongs to a stop on this rider's active task and that the bag tag is
  unused, then records `PICKED_UP` and `BAG_TAGGED`. A wrong or unknown code is rejected and
  logged, and scans are rate-limited per rider. Return stops are confirmed by the brand
  scanning the rider's screen, or pressing "Received" in their dashboard.
- **Wasted visit** (brand closed, nothing ready): the rider marks the task `WASTED` with a reason.
  The pickups move to the next round, the brand is notified, and a `WASTED_VISIT` incident is
  recorded.
- **At the hub,** hub staff scan each bag tag in, not the rider. The hub's count is the
  independent check. If the rider collected 5 pickups and the hub received 4, a `COUNT_MISMATCH`
  alert names the rider and the missing pickup.

### 10.4 Scanning and handover proof

Scanning is a **screen in our apps**, using the phone camera. There is no scanner device to build.

| Who scans | What                                              | Where               | Proves                                                   |
| --------- | ------------------------------------------------- | ------------------- | -------------------------------------------------------- |
| Rider     | Brand's pickup QR (on the brand's screen or slip) | At the brand        | The rider was there and the brand handed this order over |
| Rider     | A fresh bag tag, stuck on the bag                 | At the brand        | This bag is this pickup from now on                      |
| Hub staff | Bag tag                                           | Hub check-in        | The bag arrived; feeds the count check                   |
| Hub staff | Parcel label                                      | Handover to partner | The partner took this parcel, at this time               |
| Hub staff | Parcel label                                      | Return check-in     | The parcel is back with us                               |
| Brand     | Rider's screen, or "Received" button              | Return to brand     | The brand got its items back                             |

**What we build:**

- **One shared `QrScanner` component** in `packages/components`, used by the `/rider` screens in
  `apps/web` and the hub screens in `apps/admin`. It uses the browser's built-in
  `BarcodeDetector` where available (Android Chrome). Elsewhere (iPhone, older phones) it falls
  back to decoding camera frames with `jsqr`, which the API already uses for bank QR
  verification. It includes:
  - a "type the code" fallback,
  - success feedback (beep, vibration, a green tick),
  - clear messages for a wrong code, a used tag, or an order not on this task.
- **QR generation** with `qrcode` (already in `apps/api`), for the brand's pickup QR, printable
  bag-tag sheets, and the parcel label.
- **USB barcode scanners at the hub are optional and need no code.** They type into the same
  input as the keyboard fallback, which makes bulk scanning faster.

Every scan stores who scanned, when (device time plus server time) and, when the device allows,
location. Neither the bag tag nor the brand's pickup slip ever shows the buyer's details.

### 10.5 Rider pay (contractors)

- A completed task earns `visitAmount + extraStopAmount × (stops − 1)`. A wasted visit earns
  `wastedVisitAmount`. Amounts come from the active `RiderPayRate` for the hub's country and are
  snapshotted at completion, so a later rate change never changes past earnings.
- Earnings go `PENDING → AVAILABLE` after the same holding period brand payouts use, then into the
  **existing withdraw system** as a third balance source next to commissions and brand payouts.
  Riders register a bank account through the existing bank-accounts flow (including QR
  verification).
- Employees get tasks tracked the same way but no earnings rows. Salary is outside Outfiqe.

### 10.6 Privacy

- First mile: riders see the brand's pickup location and contact only.
- Hub staff see the buyer's name, phone and address only on the parcel label and packing screen.
- **Brands lose access to the buyer's phone and address** on `OUTFIQE_LOGISTICS` groups. They see
  the order reference and their own lines only. This reverses the decision recorded in
  `orders/README.md` ("Per-brand fulfilment groups"), which existed only because brands
  self-shipped. `BRAND_SHIPS` groups keep today's access, because those brands still ship.

## 11. Partial refunds

One refund engine handles every refund: partial or whole, platform-caused or buyer-caused, before
or after delivery. **Whole-order cancel and return are rebuilt on top of it** (refund every
remaining line, plus fees where the rules say so), so there is one money path, not two.

### 11.1 What can trigger one

| Trigger                                                                | Who                            | `causedBy`                   | When allowed                                                                              |
| ---------------------------------------------------------------------- | ------------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------- |
| Brand can't supply some units                                          | Brand requests, admin approves | `BRAND`                      | Pickup still `AWAITING_BRAND` or `READY_FOR_PICKUP` (brand-shipped: `PLACED` or `PACKED`) |
| Hub inspection fails some units (damaged, wrong item or size, missing) | Hub staff                      | `BRAND`                      | Pickup `AT_HUB`                                                                           |
| Buyer cancels some lines                                               | Buyer                          | `BUYER`                      | That line's pickup still `AWAITING_BRAND` or `READY_FOR_PICKUP`                           |
| Parcel refused, undeliverable or returned                              | Hub staff, at return check-in  | Depends on the reason (12.1) | `RETURNED_TO_HUB`                                                                         |
| Parcel lost or damaged by the partner                                  | Admin                          | `PARTNER`                    | After `HANDED_TO_PARTNER`                                                                 |
| Admin goodwill or correction                                           | Admin                          | `PLATFORM`                   | Any time, required reason                                                                 |

The brand "unavailable" path replaces the whole-group cancellation request
(`request-cancellation`), but keeps its rule that brands ask and an admin approves. Approved
requests are recorded as `UNAVAILABLE_ITEM` incidents. The same engine also handles
`BRAND_SHIPS` groups, through the admin refund endpoint.

### 11.2 How much is refunded

For refunding `k` units of a line with `qty` units:

- **Goods:** `unitPrice × k`. `unitPrice` already includes any brand discount and is the amount
  paid including tax, which is what E-Commerce Act §10 requires to be refunded.
- **Coupon share:** `floor(platformDiscountAmount × k / qty)`. The exception is the refund that
  takes the line's last remaining units: it gets whatever coupon share is left, so all refunds of
  a line together subtract exactly `platformDiscountAmount`, with no rupee lost or created.
- **Line refund** = goods − coupon share.
- **Delivery fee and COD fee** follow `COUNTRY_LOGISTICS_POLICIES` (section 16). For Nepal:
  - refunded when nothing in the order is ever delivered and the cause was not the buyer's
    refusal or unreachability
  - kept when a parcel went out with at least one item, or when a prepaid parcel was refused
    with no fault on our side (12.1)

`assertRefundMoneyInvariant` runs inside the refund transaction:

- the sum of the refund's lines equals the refund's goods − coupon share
- every line's `refundedQty ≤ qty`
- `Order.refundedAmount ≤ Order.total`

The database backs each of these with check constraints.

### 11.3 How it runs (claim first, then move money)

```
1. Transaction:
   a. For each line: UPDATE order_items SET refunded_qty = refunded_qty + k
      WHERE id = $line AND refunded_qty + k <= qty      (0 rows → 409, nothing written)
   b. Insert OrderRefund (PENDING) + OrderRefundLines; unique idempotencyKey per order
   c. Order.refundedAmount += amount (the check constraint backs this)
   d. Stock, payouts, commissions, coupon, pickup/order status (11.5)
2. After commit: move the money (11.4), then mark SUCCEEDED / NEEDS_MANUAL / RECORDED
3. Customer email + notification, brand notification, PlatformAuditLog
   (order.partially-refunded)
```

- A double click, or two admins at once, can't refund the same units twice: the second
  conditional update finds no room and returns `409`. This follows the existing return path's
  "the guarded status change wins before any money moves" rule.
- **A refund left `PENDING`** (the process died between commit and the gateway call) is **not**
  retried automatically, because the gateway may already have paid. A sweep after 15 minutes
  marks it `NEEDS_MANUAL`, sets `Order.needsManualRefund` and emails ops, as failed refunds do
  today.

### 11.4 Moving the money, by payment method

| Payment                    | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Khalti, paid**           | `paymentService.refund` gains an `amount`. Khalti's refund API accepts a partial amount in paisa ([docs](https://docs.khalti.com/api/refund/)). Before launch, test in the sandbox whether Khalti accepts a **second** partial refund on the same transaction. If it doesn't, later partial refunds on that order go to `NEEDS_MANUAL` (the existing manual-refund alert), never a silent failure. Recorded as a `REFUND` `PaymentTransaction`.                                |
| **eSewa, paid**            | Our ePay v2 integration has no refund call, so the refund goes to the **manual refund queue** (11.6). `paymentService.refund` used to report eSewa refunds as succeeded; it now reports `succeeded: false` for any provider without a refund call. Ask eSewa merchant support whether a refund API is available for our account; if it is, adding it to `esewa.provider.ts` makes these automatic with no other change.                                                        |
| **COD, not yet delivered** | No money was taken. The refund lowers `Shipment.codAmountToCollect` (`method = COD_REDUCTION`). If the parcel is already with a partner, `updateCodAmount` is called when the partner supports it; otherwise an ops alert says "tell the partner the new amount". A `COD_AMOUNT_CHANGED` event records it either way. **A parcel is never handed over with a stale COD amount:** the handover scan compares the label amount with the current amount and blocks on a mismatch. |
| **COD, already collected** | Manual refund queue (11.6).                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Wallet, unpaid**         | Not refundable. An unpaid wallet order never reaches fulfilment, so cancelling it stays the existing whole-order path.                                                                                                                                                                                                                                                                                                                                                         |

`paymentStatus` becomes `PARTIALLY_REFUNDED` while `refundedAmount < total`, and `REFUNDED` when
they are equal.

As built, a refund's `status` is `PENDING`, `SUCCEEDED` or `NEEDS_MANUAL`, and its `method` is
`GATEWAY` (Khalti), `CASH_NOT_COLLECTED` (COD before delivery) or `MANUAL_TRANSFER` (paid by staff
from the queue). Delivery and COD fees come back only in the refund that empties the order, and
never for a customer refusal.

### 11.5 What else changes with the refunded units

| Area                        | Rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stock**                   | Buyer cancels before pickup: restored now (movement source `ORDER_REFUND`, one per refund); the item never left the brand. Brand says unavailable: **not** restored; the stock didn't exist, and the brand fixes its count. Failed inspection or returned parcel: restored only when the brand confirms the item is back (section 12), and only for units the hub graded resellable. Other staff refunds: staff choose "put these units back on sale".                                                                                                                                                                                                                          |
| **Brand payout**            | Whole line refunded: the line's `BrandPayout` is `VOIDED`. Some units refunded: the brand payout, Outfiqe's platform fee and the gateway fee all shrink in exact proportion to the units refunded. Outfiqe's fee for the kept units is the full-line fee, rebuilt from the payout's stored `commissionRuleId`, × kept ÷ bought. It is always worked out from the full line, so repeated refunds don't drift, and the tier is never recalculated on the smaller line. Brand-fault penalties go through reliability incidents (section 15), not fees. Only `PENDING` or `AVAILABLE` payouts are changed; a `WITHDRAWN` one is flagged `needsManualClawback`, as returns do today. |
| **Commissions**             | The creator commission is a flat tier amount per order line. It stays unchanged while at least one unit is kept, and is voided only when every unit is refunded. A `PAID` commission is flagged for clawback, not touched.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Coupon**                  | `causedBy` is `PLATFORM`, `BRAND` or `PARTNER`: the refunded coupon share goes back to the coupon budget (`releaseBudget`) and is added to `CouponRedemption.releasedAmount`. The redemption stays `CONSUMED`, because the order still exists. `causedBy` is `BUYER`: no budget is given back, matching today's "a buyer's own cancellation spends the coupon" rule.                                                                                                                                                                                                                                                                                                            |
| **Coupon minimum**          | A **buyer** line cancel that would drop the order's remaining goods below the coupon's minimum order value is refused (`409 COUPON_MINIMUM_NOT_MET`) with the message "cancel the whole order instead". Otherwise "buy three to unlock the coupon, cancel two" would keep the discount. Platform- or brand-caused refunds never re-check the minimum; the customer isn't punished for our failure.                                                                                                                                                                                                                                                                              |
| **Pickup and order status** | A pickup whose lines are all refunded becomes `CANCELLED`. An order whose lines are all refunded before delivery becomes `CANCELLED` in the rollup. Otherwise statuses don't change: the remaining items carry on.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### 11.6 The manual refund queue

When the money can't go back on its own (eSewa, COD already collected, a Khalti refusal or a refund
stuck in `PENDING`), the refund becomes `NEEDS_MANUAL` and lands in the admin queue
(`/orders/refunds`, "Refunds to pay").

- **Customer refund details.** The customer is emailed and notified (`ORDER_REFUND_DETAILS_NEEDED`)
  and sees a form on the order page: Khalti ID, eSewa ID, or a bank account from the existing Nepal
  bank list, the account holder name, and a required "This account is mine" box. It is prefilled
  from the order's phone and name. It is shown only when a refund can't go back automatically,
  and is editable until staff mark the refund paid.
- **Reminder.** Until the details are added, the customer gets a reminder every 3 days.
- **Privacy.** Bank account numbers are stored encrypted and shown as the last 4 digits. Staff
  reveal the full number with a button, and every reveal is written to the platform audit log.
- **Paying.** Staff send the money and press "Mark as paid" with the transfer reference. The refund
  becomes `SUCCEEDED` / `MANUAL_TRANSFER` and the customer is told (`ORDER_REFUND_ISSUED`).
- **No store credit at launch.** Every refund is real money.

## 12. Failed deliveries, refusals and returns

### 12.1 Failed delivery

Each `DELIVERY_FAILED` carries a `DeliveryFailureReason`. The customer is notified on each failure
with the reason and the partner's next attempt. The partner retries under its own policy. When it
reports `RETURNING`, the parcel heads back to the hub.

**Who pays is decided at the hub, not from the partner's word.** When the parcel is checked back
in, staff confirm the reason and inspect the items:

| Confirmed outcome                                   | Prepaid order                                   | COD order                                                          | Brand                                                     |
| --------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| Refused or unreachable, items correct and undamaged | Goods refunded, delivery fee kept               | Nothing collected, nothing refunded. A refusal is recorded (12.2). | Payout voided, item returned, **no charge**               |
| Wrong or damaged item (our or the brand's fault)    | Everything refunded, including the delivery fee | Nothing collected, no refusal recorded                             | Payout voided, `FAILED_INSPECTION` incident               |
| Partner damaged or lost it                          | Everything refunded, including the delivery fee | Nothing collected, no refusal recorded                             | Payout voided, **no charge**, partner claim opened (12.4) |

### 12.2 Repeat refusals and COD

- A refusal is recorded only for the first row of 12.1 (customer-side, items correct).
- At checkout, COD is unavailable when the account **or** the phone number (E.164) has
  `codRefusalLimit` refusals within `codRefusalWindowDays`. That is 2 within 365 days for Nepal.
  The API returns `COD_UNAVAILABLE_REFUSALS`; the web app shows the prepaid options with a short
  explanation.
- Ops can clear a customer's refusals (for example, after a genuine emergency) with a required
  reason, written to `PlatformAuditLog`.
- The rule and its limits are written on the published delivery and refund terms page, as the Act
  requires.

### 12.3 Back to the brand

```
Parcel RETURNED_TO_HUB (hub scan)
  → each pickup inside: RETURN_AT_HUB, per line units graded RESELLABLE or DAMAGED
  → refunds per 12.1 through the refund engine (section 11)
  → return stops added to that brand's next round visit → RETURNING_TO_BRAND
  → brand confirms receipt → RETURNED_TO_BRAND
  → resellable units restocked (ORDER_RESTORE); damaged units are not restocked and are flagged
    for brand/ops resolution
```

If the brand hasn't confirmed 48 hours after the rider's drop-off scan, it is confirmed
automatically on the strength of the scan, and the brand is told. Items from failed inspections
go back the same way.

### 12.4 Lost parcels

A partner `LOST` event, or an admin marking a parcel lost after the no-update alert, refunds every
remaining line plus the delivery fee to the customer (`causedBy = PARTNER`). It also opens a claim
on the `Shipment` (`partnerClaimAmount`, `partnerClaimStatus`) for finance to recover from the
partner.

### 12.5 Today's admin return endpoint

`POST /orders/admin/:orderId/return` stays for `BRAND_SHIPS` orders. For `OUTFIQE_LOGISTICS`
orders the hub return check-in replaces it, because the return is now driven by a real parcel
coming back rather than an admin's word.

## 13. COD collection and remittance

- The partner's `DELIVERED` event carries `codCollectedAmount` when it has one; manual partners
  enter it on the parcel or in the status import. A collected amount different from
  `codAmountToCollect` raises an alert.
- Collection moves the order `paymentStatus: DUE → PAID`.
- Finance records each payment a partner makes as a `CodRemittance`, ticking the parcels it covers
  (`CodRemittanceLine`, one per parcel, so cash can't be counted twice). The partner fee is
  recorded per parcel.
- The admin COD report lists delivered COD parcels that haven't been remitted yet. Parcels older
  than the partner's `codRemittanceDays` raise an alert.

## 14. Delivery promise and time-limit alerts

### 14.1 Delivery promise

The E-Commerce Act requires sellers to deliver by the agreed time (§16) and to show the delivery
timeline up front, so every hub-flow order carries a promise:

- `DeliveryZone.minDeliveryDays` / `maxDeliveryDays` are working days, counted in the hub's time
  zone and working week. Defaults are 1–2 inside the valley; set per zone in admin as coverage
  widens.
- Cart and checkout show the estimated date range (`GET /delivery-zones/estimate?city=`). Checkout
  snapshots it onto `Order.promisedDeliveryFrom` / `promisedDeliveryBy`, so it never moves for a
  placed order.
- `BRAND_SHIPS` orders show the zone's range as an estimate, the same way.

### 14.2 Alerts

A scheduled job in `src/jobs/` replaces the stale-shipment reminder digest for
`OUTFIQE_LOGISTICS` orders. Time limits count hub working hours, and defaults live in
`LOGISTICS_TIME_LIMITS` (`logistics.constants.ts`):

| Alert                    | Fires when                                                                     | Goes to                                           |
| ------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| Brand not ready          | `AWAITING_BRAND` past 1 working day                                            | Brand, then ops after 2                           |
| Missed round             | A round started and its assigned pickups weren't scanned                       | Ops                                               |
| Waiting at hub           | Any pickup `AT_HUB` past the next partner collection without its parcel packed | Ops (the late-brand case in 5.5)                  |
| Partner hasn't collected | Parcel booked and `PACKED` past the next partner collection                    | Ops                                               |
| No partner update        | Not final, no event for 2 working days                                         | Ops                                               |
| Promise at risk          | Not `OUT_FOR_DELIVERY` by the day before `promisedDeliveryBy`                  | Ops                                               |
| Promise missed           | Not `DELIVERED` by `promisedDeliveryBy`                                        | Ops, plus an apology notification to the customer |
| Unknown partner status   | Any `UNKNOWN_PARTNER_STATUS`                                                   | Ops                                               |
| Count or COD mismatch    | Sections 10.3 and 13                                                           | Ops                                               |
| COD remittance overdue   | Delivered COD parcel unremitted past `codRemittanceDays`                       | Finance                                           |

`LogisticsAlert`'s unique key makes each alert fire once per stage per pickup or parcel. It is
resolved automatically when the subject moves on. Ops alerts go through the existing role-based
notifications to admins holding `logisticsManage`.

## 15. Brand reliability

Every `BrandFulfilmentIncident` (unavailable item, failed inspection, wasted visit, missed round)
counts toward a rolling 30-day score:

- The brand sees a "Delivery problems" panel only once it has had one, with the reason for each and
  a plain note that customer refusals and returns never count.
- **Warning:** at least **5** incidents **and** more than **10%** of the brand's hub pickups in the
  30 days. A flat count would treat a brand with 300 pickups the same as one with 5.
- **Review:** at least **10** incidents **and** more than **20%**. Suspension stays an admin
  decision, using the existing brand moderation tools.
- **New brands are never warned** during their first 30 days of Outfiqe pickup, or until they have
  had 20 hub pickups, whichever comes later.
- Staff see every brand from **3** incidents on (Logistics → Brand reliability), with its pickups
  and share, so they can reach out before anything formal.
- Brands are never charged for a customer's refusal or a partner's failure; those aren't incidents.

## 16. Built for more countries

Launch is one country. Everything below is designed now, because it is cheap to get right before
launch and expensive to change after.

- **Country and currency on every order.** `Order.countryCode` and `Order.currency` are
  snapshotted at checkout, and every new money table (`Shipment`, `OrderRefund`, `CodRemittance`,
  `RiderPayRate`, `RiderEarning`) carries `currency`. Amounts stay whole units, matching the
  existing ledger.
- **Addresses and phones.** Orders gain nullable `region`/`postalCode`, and phones are stored
  normalised in E.164 (`libphonenumber-js`, using the order's country). Partner bookings always
  use the structured `PartnerAddress`.
- **Cities are scoped by country.** `DeliveryZone` has `countryCode`, and the city unique key is
  per country.
- **Time.** All timestamps are UTC. Every working-day, round, cutoff and promise calculation uses
  the hub's IANA `timeZone` and `workingDays`, through `@date-fns/tz`, never the server's clock or
  a hard-coded Nepal week.
- **Text.** The API returns codes (tracking stages, failure reasons, refund reasons, error
  codes), never sentences. Translations live in the apps.
- **Country rules in one place.** `COUNTRY_LOGISTICS_POLICIES` in `logistics.constants.ts`, keyed
  by ISO country code, holds:
  - whether COD is offered
  - `codRefusalLimit` and `codRefusalWindowDays`
  - the delivery-fee rules for refused, failed and lost parcels
  - whether contractor riders are allowed

  These are legal rules, so they change through code review, not an admin screen. Adding a country
  without an entry fails at boot.

- **Partners and payment providers** are already per country: partners through zones, payment
  providers through the existing `PaymentProvider` interface.

**Opening a new country** is a list of setup, not a redesign:

1. Legal review, and a `COUNTRY_LOGISTICS_POLICIES` entry.
2. Its currency enabled. A currency with minor units (cents) first needs the platform-wide money
   columns moved to minor units — a cross-module change to the existing ledger.
3. Delivery zones with cities and promise days, a hub, pickup zones and rider pay rates.
4. Delivery partners, each with an adapter (or `MANUAL`) and a status map.
5. A payment provider.
6. Published terms and legal pages for that country, and translations.

Cross-border parcels (customs, duties) are not part of this design. Each country runs domestically
from its own hubs.

## 17. API (illustrative)

New module `apps/api/src/modules/logistics` with topic folders `pickup-locations/`, `hubs/`,
`riders/`, `rounds/`, `hub-operations/`, `shipments/`, `partners/`, `tracking/`, `cod/` and
`reliability/`. Refunds live in `orders/refunds/`. New platform permissions are `logisticsRead`
and `logisticsManage`, next to `ordersRead`/`ordersManage`. Every write is rate-limited and
Zod-validated.

```
Brand (requireBrandOwner, scoped to the caller's brand, 404 for others)
  CRUD  /logistics/brand/pickup-locations
  POST  /orders/brand/fulfilment-groups/:groupId/ready-for-pickup
  GET   /orders/brand/fulfilment-groups/:groupId/pickup-code       (QR + text)
  GET   /orders/brand/fulfilment-groups/:groupId/pickup-slip       (data for the browser-printed slip page)
  POST  /orders/brand/fulfilment-groups/:groupId/unavailable-requests  { lines: [{ orderItemId, qty }], reason }
  POST  /orders/brand/fulfilment-groups/:groupId/confirm-return-received
  GET   /logistics/brand/reliability

Rider (requireRole RIDER; only the rider's own tasks)
  GET   /logistics/rider/tasks?roundDate=
  POST  /logistics/rider/tasks/:taskId/collect-scans  { pickupCode, bagTagCode, occurredAt, location?, idempotencyKey }
  POST  /logistics/rider/tasks/:taskId/return-scans   { bagTagCode, occurredAt, idempotencyKey }
  POST  /logistics/rider/tasks/:taskId/wasted         { reason }

Hub and ops (logisticsManage)
  GET   /logistics/admin/pickup-board?roundStartsAt=&zoneId=
  POST  /logistics/admin/rider-tasks                  { riderId, pickupLocationId, roundStartsAt, fulfilmentGroupIds }
  POST  /logistics/admin/bag-tag-batches              { count }   (printable sheet)
  POST  /logistics/hub/check-ins                      { bagTagCode | pickupCode, receivedUnits: [{ orderItemId, qty }], idempotencyKey }
  POST  /logistics/hub/fulfilment-groups/:groupId/inspections { lines: [{ orderItemId, passedQty, failedQty, failReason? }] }
  POST  /logistics/hub/shipments                      { orderId, fulfilmentGroupIds?, weightGrams, parcelCount }
  GET   /logistics/hub/shipments/:shipmentId/label    (data for the browser-printed 100 × 150 mm label page)
  PATCH /logistics/hub/shipments/:shipmentId/partner  { partnerId }
  POST  /logistics/hub/shipments/:shipmentId/manual-booking { partnerReference }
  POST  /logistics/hub/shipments/:shipmentId/rebook   { partnerId, reason }
  POST  /logistics/hub/shipments/:shipmentId/handover { idempotencyKey }
  POST  /logistics/hub/return-check-ins               { trackingCode, confirmedReason, lines: [{ orderItemId, resellableQty, damagedQty }] }
  POST  /logistics/admin/shipments/:shipmentId/events { code, rawStatus?, occurredAt, reasonCode?, codCollectedAmount? }
  POST  /logistics/admin/corrections                  { fulfilmentGroupId? | shipmentId?, toStatus, reason }
  CRUD  /logistics/admin/hubs, /:hubId/pickup-zones
  CRUD  /logistics/admin/delivery-partners, /:partnerId/accounts, /:partnerId/coverage, /:partnerId/status-map
  POST  /logistics/admin/partners/:partnerId/status-imports   (CSV)
  POST  /logistics/admin/partners/:partnerId/replay-unmapped
  CRUD  /logistics/admin/riders, /logistics/admin/rider-pay-rates
  POST  /logistics/admin/customers/:userId/clear-refusals     { reason }
  POST  /logistics/admin/cod-remittances              { partnerId, receivedAt, amountReceived, shipmentIds }

Refunds
  POST  /orders/admin/:orderId/refunds                { lines: [{ orderItemId, qty }], reasonCode, causedBy, note?, idempotencyKey }   (ordersManage)
  POST  /orders/admin/unavailable-requests/:requestId/approve | /reject
  POST  /orders/:orderId/line-cancellations           { lines: [{ orderItemId, qty }], idempotencyKey }                                (buyer)

Customer
  GET   /delivery-zones/estimate?city=                (promise range for cart/checkout)
  GET   /orders/:orderId                              (+ shipments[], refunds[], trackingStage, promisedDeliveryFrom/By)
  GET   /orders/:orderId/tracking                     (timeline: customer-safe events only)
  POST  /orders/:orderId/delivery-disputes            { shipmentId, note }   (within 3 days of "delivered", rate-limited)

Partners
  POST  /webhooks/delivery-partners/:partnerCode
```

The customer timeline only shows customer-safe events. Internal codes (`COUNT_MISMATCH`, rider
names, raw partner payloads) never reach the buyer API. Brand responses never include buyer
contact data for `OUTFIQE_LOGISTICS` groups.

## 18. Rollout without breaking orders in flight

- Every existing group is backfilled with `fulfilmentMode = BRAND_SHIPS`, and every existing order
  with `countryCode = NP` and `currency = NPR`. Both backfills are idempotent and only touch rows
  where the value is null.
- Orders placed before the switch finish on the old flow; nothing in flight changes shape.
- Before switching on: valley brands have added pickup locations, the hub and its pickup zones are
  set up, at least one partner covers the valley zones (manual adapter is fine), riders are
  invited and verified, bag tags are printed, and the terms page carries the delivery-fee and
  refusal rules.
- Switching on the `order_logistics` feature flag makes new orders from valley brands to covered cities
  go through the hub. Coverage widens by adding `DeliveryPartnerZone` rows.

## 19. Security and abuse

- **Webhooks:** per-partner signature check on the raw body, a per-partner rate limit and a body
  size limit. Unsigned or bad-signature requests are stored for audit and never applied.
  _(OWASP Top 10 A08:2021)_
- **Codes:** pickup codes and bag tags are random, not database ids. Scans only resolve against the
  scanning rider's own active task, and wrong codes are counted per rider.
- **Role scoping:** riders see only their tasks, brands only their groups (404 for others), and
  hub screens need `logisticsManage`. _(ASVS V4)_
- **PII:** buyer contact details are visible to hub staff on packing screens only, and sent to the
  partner in the booking request. Every partner booking payload is logged without the phone
  number.
- **Rider accounts:** invite-only, same session security as all logins, all sessions revoked on
  suspension. Audit log entries for invites, suspensions, identity verification and refusal
  clearing. _(ASVS V2, V3, V7)_
- **Refunds:** claim first, then pay. Idempotency keys, DB check constraints and audit-logged
  actions. No refund amount ever comes from the client: the client sends units, the server
  prices them.

## 20. Testing

Ships with each build step, per `CLAUDE.md`:

- **Unit:**
  - the allowed-moves maps for pickups and parcels (every pair), and out-of-order and skipped
    events
  - coarse-status mapping and the tracking stage
  - the flow decision matrix (switch, pickup location, coverage, COD support)
  - the coupon-share split (sums to exactly `platformDiscountAmount` across any sequence of
    partial refunds)
  - the 12.1 outcome table
  - the refusal rule at its boundaries
  - working-day and promise maths across Saturdays, hub closing time and time zones
  - rider pay calculation
  - each adapter's parsing and mapping against recorded partner payloads
- **Integration (real Postgres and Redis):**
  - two concurrent refunds of the same units → one success, one 409
  - duplicate webhook or import row → one event
  - out-of-order webhooks → correct final status
  - three-brand combined parcel delivered → each group delivered, `deliveredAt` stamped once,
    payouts mature
  - late brand → two parcels → order delivered only after both
  - mixed hub and brand-shipped order rolls up correctly
  - returned combined parcel → split back per brand, stock restored only on confirmation
  - COD reduction before and after handover
  - buyer line cancel below the coupon minimum → refused
  - third COD attempt after two refusals → refused
  - a booking retry never double-books
  - partner update matched by their ID, by our merchant reference, or not at all (flagged)
  - rebook → old booking cancelled, new booking on the same parcel, late updates from the old
    partner stored but not applied
  - a `PENDING` refund sweep → `NEEDS_MANUAL`
  - a bag tag can't be attached twice
- **Component (web/admin):**
  - rider round and scan screens (camera, typed fallback, offline queue and sync)
  - pickup board, hub check-in, inspection and pack screens
  - customer tracking timeline (every stage, empty and failed states) and delivery estimate
  - brand pickup locations, "Ready for pickup", unavailable-items request and reliability panel

## 21. Build order

**How it ships:**

- One pull request per step into `dev`, in this order.
- Every step sits behind the `order_logistics` feature flag, which stays off, so nothing changes
  for users until it is switched on.
- Each step is usable on its own and ships with its tests and READMEs.

1. **Foundation.**
   - Country, currency and international phone on orders, with backfill.
   - Country-scoped zones and delivery-promise days.
   - `Hub`, `BrandPickupLocation`, `Shipment`, `TrackingEvent` and the pickup status columns.
   - `recordEvent` with its state machines, and the coarse-status mapping into
     `setOrderFulfilmentRollup`.
   - The `order_logistics` flag.
2. **Hubs, pickup locations, flow and promise.**
   - The `platform:logistics:*` permissions.
   - Hub settings and working-day calendar.
   - Brand pickup locations, with the dashboard banner and the city question on the apply form.
   - The flow decision at checkout, and the delivery estimate at checkout.
3. **Brand side.**
   - "Ready for pickup", the pickup QR and printable slip.
   - Brands can't self-advance hub orders.
   - Buyer contact is hidden from brand views of hub orders.
   - "Unavailable items" requests.
4. **Riders.**
   - The `RIDER` role, invites and in-person verification.
   - Bag tags, rounds and the pickup board.
   - The shared QR scanner, and the `/rider` app with offline scans.
   - Wasted visits.
5. **Partial refund engine.**
   - Cancel and return rebuilt on top of it.
   - Brand unavailable approvals, buyer line cancel, COD amount reduction.
   - Khalti partial refunds and the refund notification.
6. **Hub operations and manual partners.** With this, the flow works end to end:
   - Check-in, count check, inspection, packing and printable labels.
   - Partner records, accounts, coverage and status maps.
   - Bookings with manual entry, CSV status import, handover and rebooking.
7. **Partner API connections.**
   - Adapter registry, the raw-body webhook receiver with its three verification modes,
     receipts via the outbox, booking via the outbox, polling and the 24-hour safety net.
   - A sample adapter.
8. **Customer side.** Tracking stage and timeline, live order updates, and delivery disputes.
9. **Failed deliveries and returns.**
   - Hub return check-in with the 12.1 outcomes.
   - The refusal rule at checkout.
   - Return-to-brand stops, lost parcels and partner claims.
   - Brand reliability.
10. **Money operations.**
    - COD collection → `PAID`, remittances and the COD report.
    - Contractor rider pay in the withdraw system.
11. **Time-limit alerts and full-flow tests.** Alerts replace the stale-shipment digest for hub
    orders, and an end-to-end integration suite covers the whole flow.

**As each delivery partner provides API access:** one adapter (booking, webhook or polling, and its
status map) built against their sandbox and recorded payloads, then a switch of that partner's
`adapterKey` from `MANUAL`.

**Where it stands (18 October 2026):** every step above is built and tested, including a final
quality pass on the full flow, and switched off. `logistics.journeys.integration.test.ts` runs seven
complete journeys:

- a three-brand combined parcel, with the cash and rider pay settled;
- a late brand sent in a second parcel;
- a mixed hub and brand-shipped order;
- refusal, return and restock;
- a lost parcel and its partner claim;
- a failed inspection on a coupon order, with the cash to collect lowered;
- a partner connected by a signed webhook.

The status-spreadsheet route has its own full-flow test in `hub-operation.integration.test.ts`.

## 22. Step-by-step funnels (as built)

What each person sees and does, in order. Screen names and routes are in brackets.

### 22.1 Customer

**Buying**

1. Opens checkout (`/checkout`), picks a saved address or types a new one, and picks a payment
   method.
2. As soon as the city is typed, the summary shows the delivery fee and an "Estimated delivery"
   range in working days.
3. Cash on delivery is greyed out, with the reason shown, when either:
   - the coupon is prepaid-only, or
   - this account or the phone typed refused 2 deliveries in the last 12 months
     (`GET /logistics/cod-eligibility`, which never returns the count).

   The server checks again at checkout (`COD_UNAVAILABLE_REFUSALS`).

4. Places the order. Cash on delivery goes straight to the order page; Khalti and eSewa go to the
   payment page first. The promise is saved on the order and never changes.

**Following the order**

1. Opens the order (`/orders/[id]`). It shows:
   - the current stage and a progress bar;
   - "collected from 1 of 2 brands";
   - the promised date.
2. The page refreshes by itself on `ORDER_STATUS_CHANGED`, `ORDER_REFUND_ISSUED`,
   `ORDER_REFUND_DETAILS_NEEDED` and `ORDER_DELIVERY_LATE`. Notifications go out only for the
   stages that matter.
3. Each parcel shows our `OFQ` code and the partner's tracking link. "What happened" lists the
   events, newest first, in Nepal time.
4. The partner reports "Delivered". The customer, every brand in the parcel and our team see it at
   once.
5. For 3 days after delivery, "I didn't receive this" records `DELIVERY_DISPUTED` on the parcel
   and raises a staff alert.

**Cancelling items and getting money back**

1. "Cancel items" is shown while a brand still has the items. The customer picks the units and
   can add a reason.
   - Dropping below a coupon's minimum spend asks them to cancel the whole order instead.
   - One idempotency key per attempt, so a double tap never cancels twice.
2. The money goes back by payment method:
   - Khalti: refunded automatically.
   - Cash on delivery: the amount to collect goes down.
   - eSewa, or a Khalti refusal: step 3.
3. "Where should we send your refund?" The customer gets an email and a notification, then
   chooses a Khalti ID, an eSewa ID or a bank account, enters the holder name and ticks "This
   account is mine". A reminder goes out every 3 days until they do.
4. Staff mark it paid and the customer is told. The card then shows the details read-only, with
   a bank account as its last 4 digits.
5. The Refunds list shows each refund: amount, reason, method and the items it covered.

### 22.2 Brand

**Setup**

1. A banner on the Orders page asks for a pickup location until one exists. The apply form
   already asked for the city.
2. On `/pickup-locations` the brand adds:
   - the address and landmark;
   - the contact person and phone;
   - an optional map pin, pasted from Google Maps;
   - opening hours;
   - the city, picked from the shoppers' city list.
3. Each location shows "Outfiqe pickup" (inside a hub's pickup areas) or "You ship". With several
   locations, the brand picks a default.

**Every order**

1. `/manage-orders` shows the pickup stage. A hub order's detail page has no customer name, phone
   or address, and no ship or deliver buttons; the API refuses them with `409
DELIVERED_BY_OUTFIQE`.
2. The brand packs and presses "Mark ready for pickup". The next round after the ready-by cut-off
   collects it.
3. The pickup QR and code appear on screen. "Print pickup slip" (`/print/pickup-slip/[groupId]`)
   is optional.
4. The rider scans the code and tags the bag. The page then moves through "Collected by Outfiqe"
   and "At Outfiqe hub" to the parcel's stages.
5. Payouts mature from the partner's "Delivered".

**When something isn't right**

1. **Can't supply an item.** "Items you can't supply" works before collection: the brand picks
   the units and a reason. Staff approve (the customer is refunded for those units, and it counts
   as a reliability incident) or reject with a note.
2. **Not marked ready.** After 1 working day the brand gets `LOGISTICS_BRAND_NOTICE`. After 2,
   staff are alerted.
3. **Items coming back.** The "Items coming back" panel shows each return, where it is, and how
   many units are fine or damaged.
   - After the rider's hand-over, "Confirm received" restocks the fine units.
   - After 48 hours it is confirmed automatically.
4. **Reliability.** Once the brand has a problem, a "Delivery problems" panel shows the last 30
   days' incidents. The brand is warned at 5 problems that are over 10% of its pickups, and
   reviewed at 10 over 20%. New brands (first 30 days or first 20 pickups) are never warned.
   Customer refusals and partner faults never count.

### 22.3 Rider

**Joining**

1. Staff invite the rider by email, as an employee or a contractor.
2. The rider sets a password at `/register/rider`.
3. A contractor's ID is checked in person at the hub; only the type and last 4 characters are
   stored. Staff then activate the rider.

**A visit**

1. The rider signs in at `/rider` and sees today's visits: brand, round time, and bags to collect
   and return.
2. They open a visit (`/rider/visits/[id]`), which shows the address, landmark, Call and
   Directions. Riders never see customer details.
3. They hand back returns first: "Handed to the brand" on each. The brand confirms the items
   itself.
4. Each bag takes two scans, by camera or typed code:
   - the brand's pickup code;
   - a new sticker on the bag.

   Each scan answers with "Bag collected", "No signal. Scan saved", or the reason it was refused.

5. **Offline.** Scans wait in the phone's IndexedDB, under a key per rider. They resend on
   `online`, every 30 seconds and when the app opens, with the original scan time and the same
   `Idempotency-Key`.
   - A bag already waiting on the phone can't be scanned again.
   - A refused scan offers Try again or Remove.
   - Signing out warns while scans are waiting.
6. **Ending the visit.** There are three ways:
   - every bag scanned: the visit finishes on its own;
   - "Leave without the rest": asks for confirmation, and the remaining bags go back on the board;
   - "Nothing to collect here", with a reason: a wasted visit that counts against the brand.

   None of these is offered while scans are still on the phone.

7. At the hub, staff scan each sticker in. A short count raises `COUNT_MISMATCH`, naming the
   rider.

**Pay (contractors)**

1. `/rider/earnings` shows each visit's earning: Rs 70 per visit, plus Rs 15 per extra bag, or
   Rs 35 for a wasted visit, at the rate in force.
2. Earnings are "On hold" until the return window passes, then "Ready to withdraw".
3. The rider withdraws to a bank account through the shared withdraw flow (the creator side,
   `isContractorRider`).

### 22.4 Hub setup (once, `platform:logistics:manage`)

1. **Hubs.** Logistics → Hubs: address, phone, time zone, working days, hours, round times, the
   ready-by cut-off and the partner collection time.
2. **Pickup areas.** Tick the delivery zones the hub's riders cover.
3. **Delivery zones.** Set the shortest and longest delivery days for each zone. These drive the
   promise and the late alerts.
4. **Delivery partners.** Logistics → Delivery partners:
   - the name, connection type, parcel-number pattern, cash collection and paying-in days;
   - our merchant account at the hub;
   - the zones they cover, with a priority;
   - their status names.

   An API partner also gets our webhook address pasted into their dashboard. The secrets are in
   the environment, never on screen.

5. **Team.** A Team-page role with logistics read or manage. Manage holders receive alerts.
6. **Riders.** Logistics → Riders: invite, check ID in person, activate. Suspension signs the
   rider out everywhere.
7. **Bag stickers.** Logistics → Bag stickers: a batch of 1–500 and a printable sheet. A reprint
   skips used stickers.
8. **Rider pay.** Logistics → Rider pay: keep the launch default or set a dated rate.
9. **Switch on.** Feature switches → `order_logistics`: add test brands to the allow-list.

### 22.5 A day at the hub

1. **Pickup board.** Each brand location lists its ready bags and returns, all ticked. Staff
   untick anything that shouldn't go, then assign a rider and a round (one-tap round times).
   - A visit can be returns only.
   - "Cancel visit" works until something is collected.
2. **Check in bags.** Staff type the unit count, then scan the sticker or pickup code (camera, USB
   scanner or typed). The camera stays on between bags. A short count is flagged.
3. **Inspect and pack.** Staff record failed units per bag. They are refunded straight away
   (`causedBy=BRAND`), counted as an incident, and sent back to the brand.
4. **Pack parcel.** Unlocks once every bag here is inspected; staff enter the weight and pieces.
   - "Pack only what's here" sends the rest in a later parcel.
   - The parcel gets an `OFQ` code and the best partner by zone priority (only cash-collecting
     partners for COD).
5. **Book.** Parcels → To book:
   - a manual partner: copy our code into their portal, then type their parcel number back
     (checked against the pattern and for duplicates);
   - an API partner: booked in the background;
   - a failed booking: shows the reason, with Try again or Change partner.
6. **Label.** The 100 × 150 mm label: code and QR, recipient, cash to collect, partner. "Label
   needs printing" shows until it's printed.
7. **Hand over.** Scan each label as the partner collects. The scan is refused for a parcel that
   isn't booked, has no printed label, or whose label shows an old cash amount.
8. **Updates.**
   - An API partner's updates arrive on their own.
   - A manual partner's daily sheet is uploaded on the partner page, with a row-by-row report.
   - A status given by phone goes in through "Record an update", with a reason for corrections.
9. **Returns.** Parcel → Check in return: the reason, plus fine and damaged units per item. The
   refund follows 12.1, and the items join the brand's next round.

### 22.6 Delivery partner (no Outfiqe login)

1. Gets the booking, through their API or their portal, with our `OFQ` code as the reference.
2. Collects at the hub's collection time. Our hand-over scan is the proof.
3. Sends updates by webhook, by our polling, or by a daily sheet. Every update is saved first,
   then applied.
   - Duplicates count once.
   - Out-of-order updates can't move a parcel backwards.
   - Unsigned updates are never applied.
   - An unknown status word raises an alert. Staff map it, then press "Send missed updates again".
4. "Delivered", with the cash collected, delivers the order for the customer and every brand. A
   cash mismatch raises `COD_COLLECTED_MISMATCH`.
5. "Delivery failed" leads to another attempt, or "Returning" back to the hub.
6. Pays in the collected cash, minus fees, within `codRemittanceDays`. A late payment raises
   `COD_REMITTANCE_OVERDUE`.

### 22.7 Refunds and finance

1. **Refund items.** On the order page, staff pick units and a reason. The server prices the
   refund, and a unit can never be refunded twice.
2. **Can't supply** (`/orders/unavailable-items`): approve or reject brand requests.
3. **Refunds to pay** (`/orders/refunds`): copy the wallet ID or account (a bank number is masked
   until revealed, and every reveal is logged), send the money, then mark it paid with the
   transfer reference.
4. **Partner cash** (`/logistics/cod`):
   - per partner: the cash held, the number of parcels, the oldest delivery and the amount
     overdue;
   - tick parcels and adjust fees;
   - record the reference, date and bank amount. It is refused unless it equals the ticked cash
     minus fees, and each parcel counts once.
5. **Rider pay** (`/logistics/rider-pay`): change or switch off rates, list earnings, and void one
   that is on hold or ready, with a reason. Withdrawals go through the existing withdraw review.
6. **Refused deliveries**, on the order page: "Clear refusals" with a reason, audit-logged.

### 22.8 Alerts

1. The `logistics-alerts` job runs every 10 minutes and checks the 14.2 rules in hub working
   days. Event alerts are raised inside the tracking transaction: count or cash mismatch, unknown
   status, dispute.
2. One alert exists per problem (unique `(alertType, subjectKey)`), and it notifies once:
   - staff with logistics manage get `LOGISTICS_STAFF_ALERT` plus a push;
   - for "brand not ready", the brand also gets `LOGISTICS_BRAND_NOTICE`;
   - for "promise missed", the customer gets `ORDER_DELIVERY_LATE`.
3. Logistics → Delivery alerts lists open or resolved alerts by type, with counts and links to the
   parcel or order.
4. An alert resolves itself when the order moves on, or staff resolve it with a note.

### 22.9 When things go wrong

| Case                         | Steps                                                                                                                                                                                                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A brand is late              | 2 of 3 bags are in → "pack only what's here" → parcel 1 goes out → the late bag goes as parcel 2 → the order is delivered only when both arrive.                                                                                                                                                           |
| The customer refuses         | The partner reports failed, then returning → return check-in: refused, items fine → prepaid: items refunded, fee kept; COD: refusal recorded → 2 in 12 months turns COD off → the items ride back on the brand's next round → the brand confirms (or 48 hours pass) → restock. The brand is never charged. |
| A parcel is lost             | The partner reports it, or staff record "Lost" after a no-update alert → units still in the parcel are refunded (the delivery fee too if nothing else was delivered) → a partner claim opens.                                                                                                              |
| A booking is refused         | "Booking failed" with the reason, plus an alert → Try again or Change partner. The old booking is kept, and only one is live.                                                                                                                                                                              |
| The rider is offline         | The scan is saved on the phone → the visit can't end yet → it sends later with the original time, and never twice.                                                                                                                                                                                         |
| A refund lowers the cash due | The cash to collect drops → the label needs a reprint → the hand-over scan refuses the old label.                                                                                                                                                                                                          |
| A bag is short               | Check-in counts fewer units → `COUNT_MISMATCH` names the rider and brand → settled from the scan history.                                                                                                                                                                                                  |
| "I didn't receive this"      | Reported within 3 days → a dispute event and an alert → staff check with the partner, and follow the lost-parcel steps if needed.                                                                                                                                                                          |
