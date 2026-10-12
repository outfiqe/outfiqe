# delivery-zones

## Purpose

The city picker and delivery-fee preview shared by the bag and checkout: which cities Outfiqe delivers to, grouped by delivery zone, and what delivery costs in each zone.

## Structure

- `components/CityAutocomplete.tsx` — a searchable city input. It searches as the visitor types (debounced), shows the matches grouped by zone, and says so when nothing matches. It works as a react-hook-form field (it forwards `ref`, `name`, `onBlur`).
- `api/deliveryZoneApi.ts`, `api/deliveryZoneSchemas.ts` — the zone list and the city search, and their shapes (`DeliveryZone`, `DeliveryZoneCityMatch`).
- `hooks/useDeliveryZones.ts` — every zone with its fees, cached for a while since zones rarely change.
- `hooks/useCitySearch.ts` — city search for the autocomplete.
- `utils/resolveZonePreview.ts` — `resolveZonePreview(zones, city)`: the zone a typed city belongs to, or the default zone when it matches none; `normalizeCityName` trims and lower-cases before comparing.
- `utils/groupCitiesByZone.ts` — groups search matches by zone for the dropdown.
- `index.ts` — what `cart` and `checkout` import.

## Funnel

**User-facing:** a shopper starts typing their city in the bag or at checkout → picks it from the list → sees the delivery fee for that city and how much more they need to spend for free delivery.

**Technical:** `CityAutocomplete` → `useCitySearch` → `GET /api/delivery-zones/cities?q=` (`apps/api/src/modules/delivery-zones`). The fee preview reads `useDeliveryZones` → `GET /api/delivery-zones` and runs `resolveZonePreview` on the chosen city in the browser.

## Non-obvious rationale

**The fee here is only a preview.** Matching a city to a zone in the browser keeps the fee in step with every keystroke without a request each time. The API works out the real fee again when the order is placed (`apps/api/src/modules/orders/checkout/checkout.pricing.ts`), so a stale zone list can't change what a shopper is charged.
