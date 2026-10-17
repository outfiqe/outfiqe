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
  - `components/`: `PickupBoardPage`, `PickupLocationCard` (one location's waiting bags, all
    ticked by default), `AssignRiderModal` (rider, round start with one-tap buttons for today's
    round times), `RiderTasksSection` and `RiderTaskRow` (visits with progress; "Cancel visit"
    before anything is collected).
  - `utils/roundTime.utils.ts` — round time ↔ `datetime-local` value.
- `bag-tags/` — the Bag stickers pages.
  - `/logistics/bag-tags` — `BagTagsPage` with `CreateBagTagBatchForm` (1–500 stickers) and the
    batch list.
  - `/logistics/bag-tags/$batchId` — `BagTagSheetPage`, a printable grid of the batch's unused
    stickers (QR via the shared `QrCode` + the code underneath). It prints through the
    `[data-print-sheet]` rule in `src/index.css`, which hides the rest of the admin shell.

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
