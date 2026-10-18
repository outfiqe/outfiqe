# delivery-zones

## Purpose

Delivery pricing and delivery-time estimates by city. Each zone belongs to one country and holds:

- a list of cities;
- three fees: the standard delivery fee, the order total above which delivery is free, and the
  cash-on-delivery handling fee;
- optionally, the shortest and longest delivery time in working days.

Each country has one default zone, used for any city that isn't listed.

## Structure

- `delivery-zone.routes.ts` — `/api/delivery-zones`.
  - Public:
    - `GET /` — every zone, served from the Redis response cache.
    - `GET /cities` — city search.
    - `GET /estimate?city=` — the delivery window for that city.
  - Admin (`platformGuards.ordersRead` / `ordersManage`): `GET /history`, `POST /`,
    `PATCH /:zoneId`, `PATCH /:zoneId/default`, and `DELETE /:zoneId`. Every write reloads the
    public cache straight away (`refreshCacheOnWrite`).
- `delivery-zone.controller.ts` — reads validated input and the admin principal, and sends the
  response.
- `delivery-zone.service.ts` — `deliveryZoneService`:
  - the public list and city search;
  - `findZoneForCity`;
  - `resolveFeeValuesForCity` (used by `../cart` and `../orders` checkout);
  - `estimateDeliveryWindow` (used by checkout and the estimate endpoint);
  - create/update/set-default/delete, and the change history.
- `delivery-zone.repository.ts` — `deliveryZoneRepository`: Prisma queries, including the history
  writes.
- `delivery-zone.utils.ts` — the view, fee, delivery-day and history-snapshot mappers. City names
  are normalised with the shared `normalizeCityName` (`#lib/city.utils.js`), which `logistics`
  uses too.
- `delivery-zone.schemas.ts`, `delivery-zone.types.ts` — request validation and shapes.

## Funnel

**User-facing:**

- An admin sets up zones in the admin app. For each zone they list the cities, set the fees and,
  optionally, the delivery days, and they mark one zone per country as the default.
- A shopper's cart and checkout show the delivery fee for the city they enter, the zone's
  free-delivery threshold, and the expected delivery dates.

**Technical:** admin `delivery-zones` feature → `delivery-zone.routes.ts` →
`delivery-zone.controller.ts` → `deliveryZoneService` → `deliveryZoneRepository` → Postgres via
Prisma.

- `../cart/cart.service.ts` and `../orders/checkout/checkout.pricing.ts` call
  `resolveFeeValuesForCity(city)`.
- `../orders/checkout/checkout.fulfilment.ts` calls `estimateDeliveryWindow` and stores the result
  on the order as its delivery promise.

## Non-obvious rationale

- **Each country has exactly one default zone.**
  - The first zone created in a country becomes its default automatically.
  - The default can't be deleted (`409 DEFAULT_ZONE_UNDELETABLE`); another zone has to be made the
    default first.
  - A city with no zone, or no city at all, gets the default zone's fees and delivery days.
- **A city belongs to at most one zone in its country, enforced by the database.**
  - City names are normalised before they're stored and looked up, and a unique constraint on
    `(countryCode, cityNormalized)` backs them.
  - A clash becomes `409 CITY_ALREADY_ASSIGNED` instead of a read-then-write check that could race.
  - The same city name may appear in two different countries.
- **Delivery days are working days in the country's own calendar.**
  - `estimateDeliveryWindow` counts from the day after the order, skips the country's days off
    (Saturday in Nepal), and works in the country's time zone (`COUNTRY_SETTINGS` in
    `#constants/country.constants.js`). An order placed just after midnight in Kathmandu therefore
    counts from the Kathmandu date, not the UTC one.
  - A zone with no delivery days gives no estimate.
  - The E-Commerce Act asks for the delivery timeline to be shown up front, which is why checkout
    saves the estimate on each order.
- **Every change is recorded.** Updating a zone, or moving the default, writes a history row with
  the admin, the old values and the new values in the same transaction as the change. Moving the
  default records both zones.
