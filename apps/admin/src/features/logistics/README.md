# logistics

## Purpose

The admin screens for Outfiqe-run delivery. Hub staff set up the hubs, and later run riders,
pickups, parcels and delivery partners. The behaviour is described in
`docs/PRD-ORDER-LOGISTICS.md`. The API lives in `apps/api/src/modules/logistics`.

## Structure

The feature is built in steps. Each topic folder has its own layer folders, following the admin
feature layout.

- `hubs/` — the Hubs page (`/logistics/hubs`).
  - `api/hubsApi.ts` — list, create, update and set pickup areas, against
    `/api/logistics/admin/hubs`. `api/hubsSchemas.ts` holds the matching Zod schemas.
  - `components/`:
    - `HubsPage.tsx` — the heading, "Add hub", the list, loading, empty and error states.
    - `HubCard.tsx` — one hub's schedule and pickup areas.
    - `HubFormModal.tsx` — add or edit a hub.
    - `HubPickupZonesModal.tsx` — tick the delivery zones the hub's riders collect from.
  - `schemas/hubForm.schema.ts` — form validation: times as HH:mm, closing after opening, at
    least one working day, round times as a comma-separated list.
  - `utils/hubForm.utils.ts` — form ↔ request conversion, round-time parsing and the
    working-day label.
  - `constants/` — the query key and the weekday list with Nepal's defaults (Sunday–Friday,
    `Asia/Kathmandu`).
  - `hooks/useHubs.ts` — the hubs query.
- Feature root, shared by the pages below:
  - `hooks/useSelectedHub.ts` — the open hubs and the one being looked at (the first open hub
    until staff pick another).
  - `components/HubPicker.tsx` — the hub dropdown; `components/NoOpenHubsNotice.tsx` — the empty
    state linking to Hubs when no hub is open.
  - `testing/logisticsFixtures.ts` — hub and rider fixtures and MSW helpers for the page tests.
- `riders/` — the Riders page (`/logistics/riders`).
  - `api/ridersApi.ts` — list by hub (cursor-paged), active riders for a hub, invites, invite, ID
    check, status change, against `/api/logistics/admin/riders`.
  - `components/`: `RidersPage` (hub picker, invites waiting, rider list, "Invite rider"),
    `RiderCard` (status, employment type, ID check and the allowed actions), `InviteRiderModal`,
    `IdentityCheckModal`, `PendingRiderInvites`.
  - `utils/riderActions.utils.ts` — which actions a rider's status allows, and whether a contractor
    still needs an ID check.
  - `schemas/riderForms.schema.ts`, `constants/` (labels, badge tones, query keys), `hooks/`.
- `pickup-board/` — the Pickup board page (`/logistics/pickup-board`).
  - `api/pickupBoardApi.ts` — waiting bags by location, rider visits, assign, cancel, against
    `/api/logistics/admin/pickup-board` and `/api/logistics/admin/rider-tasks`.
  - `components/`: `PickupBoardPage`, `PickupLocationCard` (one location's waiting bags to
    collect and returns to take back, all ticked by default; a visit can be returns only),
    `AssignRiderModal` (rider, round start with one-tap buttons for today's round times),
    `RiderTasksSection` and `RiderTaskRow` (visits with progress; "Cancel visit" before anything
    is collected, which puts its returns back at the hub).
  - `utils/roundTime.utils.ts` — round time ↔ `datetime-local` value.
- `bag-tags/` — the Bag stickers pages.
  - `/logistics/bag-tags` — `BagTagsPage` with `CreateBagTagBatchForm` (1–500 stickers) and the
    batch list.
  - `/logistics/bag-tags/$batchId` — `BagTagSheetPage`, a printable grid of the batch's unused
    stickers (QR via the shared `QrCode` + the code underneath). It prints through the
    `[data-print-sheet]` rule in `src/index.css`, which hides the rest of the admin shell.
- `hub-operations/` — the hub floor, against `/api/logistics/hub`.
  - `CheckInPage` (`/logistics/check-in`) — staff type the units in a bag, then scan or type its
    sticker or pickup code (`QrScanner` from `@outfiqe/components`; a USB scanner types into its
    code box). Each scan gets its own `Idempotency-Key`. `ScanLog` lists this session's results,
    with short counts and refusals called out.
  - `PackingPage` (`/logistics/packing`) — orders with bags at the hub. `OrderToPackCard` shows
    each bag; `InspectionModal` records failed units (refunded by the API); `PackParcelModal` asks
    for weight and pieces, and for "pack only what's here" when bags are still coming. "Pack
    parcel" waits until every bag here is inspected.
  - `HandoverPage` (`/logistics/handover`) — scan each parcel label as the partner collects it.
  - `api/`, `hooks/` (one per call), `constants/` (pickup status labels, parcel defaults, query
    keys).
- `shipments/` — parcels, against `/api/logistics/hub/shipments`.
  - `ParcelsPage` (`/logistics/parcels`, `?queue=`) — To book / Ready to hand over / With the
    partner / Finished. `ParcelCard` shows the code large with a copy button, the cash to
    collect, a "Label needs printing" badge, `ManualBookingForm` (the partner's parcel number)
    and "Change partner" (`RebookParcelModal`). `ParcelBookingActions` decides what booking help
    to show: "Booking with …" while a connected partner is booking it, the partner's reason and
    **Try again** (`useRetryParcelBooking`) when that booking failed, and `ManualBookingForm` for
    a manual partner or a failed booking.
  - `ParcelDetailPage` (`/logistics/parcels/$shipmentId`) — contents, partner and the full event
    timeline (`utils/parcelEvent.utils.ts` turns event codes into words), plus
    `RecordParcelUpdateModal` for a status the partner gave by phone (or a logged correction).
    For a parcel that went out with a partner, **Check in return** opens `ReturnCheckInModal`:
    why it came back (refused or unreachable, wrong or damaged item, damaged by the partner, with
    what each one means for the refund in `RETURN_OUTCOME_HINTS`) and, per item, how many units
    are fine and how many are damaged (`POST /api/logistics/hub/shipments/:id/return-check-in`).
    Once checked in, the page says what was decided and any claim against the partner.
  - `ParcelLabelPrintPage` (`/logistics/parcels/$shipmentId/label`) — the 100 × 150 mm label: our
    code as text and QR, the recipient, the cash to collect and the partner. Printing marks the
    label printed, which is what the handover scan checks. The `[data-parcel-label]` rule and
    `@page parcel-label` in `src/index.css` set the page size.
- `partners/` — delivery partners, against `/api/logistics/admin/partners`.
  - `PartnersPage` (`/logistics/partners`) and `PartnerFormModal` (name, code, connection,
    parcel-number pattern, cash days, tracking link, collects cash, active).
  - `PartnerDetailPage` (`/logistics/partners/$partnerId`) — `PartnerAccountsSection` (our merchant
    account per hub in the partner's country), `PartnerAreasSection` (delivery zones per hub with
    a priority), `PartnerStatusNamesSection` (their status words → ours) and
    `PartnerStatusImportSection` (upload a CSV; a row-by-row report comes back).
    `utils/readTextFile.ts` reads the file with `FileReader`.
  - For a connected partner (any connection but manual) the form also asks how they send parcel
    updates, and the detail page adds `PartnerConnectionSection` (the webhook address with a copy
    button, and per hub account which secrets are set — never the secrets) and
    `PartnerWebhookReceiptsSection` (every update received, cursor-paged, with **Send missed
    updates again** for the last day, 7 or 30 days).
- `refusals/` — `DeliveryRefusalsCard`, on the admin order page: whether cash on delivery is on for
  that order's customer, how many deliveries they refused in the last year (by account or phone),
  and **Clear refusals** with a required reason (`TextPromptModal`), which the API writes to the
  audit log. The card hides itself for staff without logistics access (the request answers
  `403`).
- `cod/` — `CodPage` (`/logistics/cod`, "Partner cash"):
  - `CodPartnerSummaryList` — one card per partner holding cash: how much, how many parcels, the
    oldest delivery and how much is past the partner's limit.
  - `UnremittedParcelsSection` + `UnremittedParcelsTable` — that partner's delivered cash parcels
    not paid in yet, with an "only overdue" filter. Staff with manage access tick parcels and
    adjust each partner fee, which starts at the partner's quoted fee.
  - `RecordRemittanceModal` — reference, arrival date and the amount the bank shows. It warns
    when that amount isn't the ticked cash minus fees; the API refuses it either way.
  - `CodRemittancesSection` + `CodRemittanceDetailModal` — payments already recorded, and the
    parcels each one covered.
  - `utils/codRemittance.utils.ts` — the ticked totals, the starting fee and date helpers.
- The parcel page shows what the partner collected and whether it has been paid in. "Record an
  update" asks for the cash collected when the update is "Delivered".
- `reliability/` — `BrandReliabilityPage` (`/logistics/reliability`): brands with 3 or more
  delivery problems in the last 30 days, with how many and whether they are warned or need review.

## Funnel

**User-facing:**

1. Someone with `platform:logistics:manage` opens Logistics → Hubs and adds a hub: address, phone,
   time zone, working days, opening hours, pickup round times, the ready-by cutoff and when the
   delivery partner collects.
2. They open "Pickup areas" and tick the delivery zones that hub's riders cover.
3. Brands with a pickup location in those zones are then shown as covered by Outfiqe pickup.
4. Someone with only `platform:logistics:read` sees the hubs but can't change them.
5. Under Riders they invite a rider by email, then, when a contractor comes in, look at the
   original ID and record its type and last 4 characters ("Check ID"), then activate them.
6. Under Bag stickers they make a batch and print the sheet.
7. On the Pickup board they see each brand location with bags marked ready, untick any bag that
   shouldn't go yet, and assign the rest to a rider for a round. The visit then shows under
   "Rider visits" with its progress as the rider scans.
8. Under Delivery partners they add each courier once: the merchant account at the hub, the zones
   they deliver to and their status names.
9. When riders bring bags in, "Check in bags" takes a unit count and a scan per bag. "Inspect and
   pack" then shows each order: inspect every bag, then pack the parcel.
10. Under Parcels, "To book" lists new parcels: copy our code into the partner's portal, type
    their parcel number back, and print the label. "Hand over" scans each label as their rider
    collects.
11. The partner's daily sheet is uploaded on the partner's page; parcels move on, and the report
    lists any row that couldn't be used and why.
12. When a partner pays in the cash it collected, finance opens Partner cash, picks the partner,
    ticks the parcels the payment covers, checks each fee and records the payment with the bank
    reference. Those parcels leave the list and the payment shows under "Payments received".

**Technical:** `routes/_authenticated.logistics.hubs.tsx` → `HubsPage` → `useHubs` /
`HubFormModal` / `HubPickupZonesModal` → `hubsApi` → `/api/logistics/admin/hubs` (guarded by
`platformGuards.logisticsRead` / `logisticsManage`).

The other pages follow the same shape: route file → page component → topic hooks → topic API →
`/api/logistics/admin/...`.

`/logistics` redirects to `/logistics/hubs`. The sidebar's
Logistics group is the `logistics` platform nav key, opened by either logistics permission
(`PLATFORM_SECTION_ACCESS` in `@outfiqe/utils`).

## Non-obvious rationale

- A hub's pickup areas are chosen from the existing delivery zones, filtered to the hub's
  country, rather than typed as a new list of cities. That way coverage, delivery fees and
  delivery estimates all use the same cities.
- No ID document is uploaded or stored. Staff check the original in person; the app keeps only
  the document type and last 4 characters, plus who checked and when.
- The round start is entered in the staff member's own browser time. Hub staff work at the hub,
  so this matches the hub's time zone in practice; the API stores the exact moment in UTC.
- The sticker sheet leaves out stickers already used, so reprinting a batch never hands a rider a
  sticker the API would refuse.
