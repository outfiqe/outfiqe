# delivery-zones

## Purpose

Lets the team set delivery pricing by city: each zone lists its cities, a standard delivery fee, a free-delivery threshold and a cash-on-delivery fee, and one zone is the default for any city not listed.

## Structure

- `api/deliveryZonesApi.ts` — list, create, update, make default and delete zones (`/delivery-zones`), plus the change history (`GET /delivery-zones/history`).
- `api/deliveryZonesSchemas.ts` — Zod schemas for a zone and a history page.
- `components/DeliveryZonesPage.tsx` — the page shell.
- `components/DeliveryZonesSection.tsx` — the zone list with its create, edit, make-default and delete actions.
- `components/CityListInput.tsx` — the input for a zone's list of cities.
- `components/DeliveryZoneHistorySection.tsx` — who changed which zone, and from what to what.
- `hooks/useDeliveryZoneHistory.ts` — the paged history query.
- `schemas/zoneForm.schema.ts` — validation for the zone form (unit-tested beside it).
- `utils/deliveryZonesCacheUpdate.ts` — the zone list's query key and the helpers that update the cached list in place after a write (add or replace a zone, move the default, remove a zone).

## Funnel

**User-facing:** an admin opens Delivery zones, adds a zone with its cities and fees, and can mark it as the default. Shoppers' carts and checkout show the fee for the city they enter.

**Technical:** `routes/_authenticated.delivery-zones.tsx` → `components/DeliveryZonesPage.tsx` → `components/DeliveryZonesSection.tsx` → `api/deliveryZonesApi.ts` → `apiClient` → `/api/delivery-zones` in `apps/api/src/modules/delivery-zones` (see its README for the single-default-zone rule).
