# delivery-zones

## Purpose

The city picker and delivery-fee preview shared by the bag and checkout: which cities Outfiqe delivers to, grouped by delivery zone, and what delivery costs in each zone.

## Structure

- `components/CityAutocomplete.tsx` — a searchable city input. It searches as the visitor types (debounced), shows the matches grouped by zone, and lets the visitor choose only a listed city. When what they typed matches nothing it says "We don't deliver to this area yet" (a loading skeleton shows while the search is pending, and a short error line if it fails). Leaving the field without choosing puts back the last chosen city. It works as a react-hook-form field (it forwards `ref`, `name`, `onBlur`). Used by the bag, checkout, saved addresses, brand applications and brand pickup locations.
- `api/deliveryZoneApi.ts`, `api/deliveryZoneSchemas.ts` — the zone list and the city search, and their shapes (`DeliveryZone`, `DeliveryZoneCityMatch`).
- `hooks/useDeliveryZones.ts` — every zone with its fees, cached for a while since zones rarely change.
- `hooks/useCitySearch.ts` — city search for the autocomplete.
- `utils/resolveZonePreview.ts` — `resolveZonePreview(zones, city)`: the zone a typed city belongs to, or the default zone when it matches none; `normalizeCityName` trims and lower-cases before comparing.
- `utils/summarizeDeliveryFees.ts` — the cheapest standard fee across zones and the free-delivery amount every zone shares; used by the product page and the bag summary.
- `utils/resolveZonePreview.ts` also exports `isListedCity(zones, city)`, whether any zone lists the city.
- `utils/groupCitiesByZone.ts` — groups search matches by zone for the dropdown.
- `hooks/useDeliveryEstimate.ts` + `utils/formatDeliveryWindow.ts` — the expected delivery dates for a city (`GET /api/delivery-zones/estimate?city=`, debounced), shown at checkout as "Estimated delivery". The dates are calendar dates already worked out in the country's working calendar by the API; the browser only formats them.
- `index.ts` — what `cart` and `checkout` import.

## Funnel

**User-facing:** a shopper starts typing their city in the bag or at checkout → picks it from the list → sees the delivery fee for that city and how much more they need to spend for free delivery. A town no zone lists can't be chosen; the field tells them Outfiqe doesn't deliver there yet.

**Technical:** `CityAutocomplete` → `useCitySearch` → `GET /api/delivery-zones/cities?q=` (`apps/api/src/modules/delivery-zones`). The fee preview reads `useDeliveryZones` → `GET /api/delivery-zones` and runs `resolveZonePreview` on the chosen city in the browser.

## Non-obvious rationale

**Only a listed city can be chosen.** Admins curate where delivery reaches, so the city field no longer offers free text. An earlier version offered `Use "<typed>"` for towns no zone listed so nobody hit a dead end, but that let typos like "sfasd" onto real shipping addresses and broke the delivery partner's city mapping. The API enforces the same rule on every write (`assertCityIsDeliverable`, see the delivery-zones API README), so this picker is a convenience, not the guard. Because of that rule, the default zone must list its cities too; `resolveZonePreview` still falls back to the default zone for a city that matches nothing, but only as defensive code for stale data.

**The fee here is only a preview.** Matching a city to a zone in the browser keeps the fee in step with every keystroke without a request each time. The API works out the real fee again when the order is placed (`apps/api/src/modules/orders/checkout/checkout.pricing.ts`), so a stale zone list can't change what a shopper is charged.
