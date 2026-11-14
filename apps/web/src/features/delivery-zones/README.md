# delivery-zones

## Purpose

The city picker and delivery-fee preview shared by the bag and checkout: which cities Outfiqe delivers to, grouped by delivery zone, and what delivery costs in each zone.

## Structure

- `components/CityAutocomplete.tsx` — a searchable city input. It searches as the visitor types (debounced), shows the matches grouped by zone, and under "Not in the list" offers `Use "<what they typed>"` whenever no listed city matches exactly (two letters or more). Leaving the field without choosing puts back the last chosen city. It works as a react-hook-form field (it forwards `ref`, `name`, `onBlur`). Used by the bag, checkout, saved addresses, brand applications and brand pickup locations.
- `api/deliveryZoneApi.ts`, `api/deliveryZoneSchemas.ts` — the zone list and the city search, and their shapes (`DeliveryZone`, `DeliveryZoneCityMatch`).
- `hooks/useDeliveryZones.ts` — every zone with its fees, cached for a while since zones rarely change.
- `hooks/useCitySearch.ts` — city search for the autocomplete.
- `utils/resolveZonePreview.ts` — `resolveZonePreview(zones, city)`: the zone a typed city belongs to, or the default zone when it matches none; `normalizeCityName` trims and lower-cases before comparing.
- `utils/groupCitiesByZone.ts` — groups search matches by zone for the dropdown.
- `hooks/useDeliveryEstimate.ts` + `utils/formatDeliveryWindow.ts` — the expected delivery dates for a city (`GET /api/delivery-zones/estimate?city=`, debounced), shown at checkout as "Estimated delivery". The dates are calendar dates already worked out in the country's working calendar by the API; the browser only formats them.
- `index.ts` — what `cart` and `checkout` import.

## Funnel

**User-facing:** a shopper starts typing their city in the bag or at checkout → picks it from the list (or picks `Use "Dhulikhel"` when their town isn't listed) → sees the delivery fee for that city and how much more they need to spend for free delivery. An unlisted town gets the default zone's fee.

**Technical:** `CityAutocomplete` → `useCitySearch` → `GET /api/delivery-zones/cities?q=` (`apps/api/src/modules/delivery-zones`). The fee preview reads `useDeliveryZones` → `GET /api/delivery-zones` and runs `resolveZonePreview` on the chosen city in the browser.

## Non-obvious rationale

**A town that no zone lists is still a valid city.** The default zone exists to cover every town an admin hasn't listed, and both `resolveZonePreview` and the API's checkout pricing already fall back to it. Before the "Not in the list" option, the field only accepted a listed city, so a shopper in an unlisted town could never place an order. The option is explicit (not saved on blur) so half-typed text like "Kath" is never kept by accident.

**The fee here is only a preview.** Matching a city to a zone in the browser keeps the fee in step with every keystroke without a request each time. The API works out the real fee again when the order is placed (`apps/api/src/modules/orders/checkout/checkout.pricing.ts`), so a stale zone list can't change what a shopper is charged.
