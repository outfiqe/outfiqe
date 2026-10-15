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

## Funnel

**User-facing:**

1. Someone with `platform:logistics:manage` opens Logistics → Hubs and adds a hub: address, phone,
   time zone, working days, opening hours, pickup round times, the ready-by cutoff and when the
   delivery partner collects.
2. They open "Pickup areas" and tick the delivery zones that hub's riders cover.
3. Brands with a pickup location in those zones are then shown as covered by Outfiqe pickup.
4. Someone with only `platform:logistics:read` sees the hubs but can't change them.

**Technical:** `routes/_authenticated.logistics.hubs.tsx` → `HubsPage` → `useHubs` /
`HubFormModal` / `HubPickupZonesModal` → `hubsApi` → `/api/logistics/admin/hubs` (guarded by
`platformGuards.logisticsRead` / `logisticsManage`).

`/logistics` redirects to `/logistics/hubs` until more logistics pages exist. The sidebar's
Logistics group is the `logistics` platform nav key, opened by either logistics permission
(`PLATFORM_SECTION_ACCESS` in `@outfiqe/utils`).

## Non-obvious rationale

- A hub's pickup areas are chosen from the existing delivery zones, filtered to the hub's
  country, rather than typed as a new list of cities. That way coverage, delivery fees and
  delivery estimates all use the same cities.
