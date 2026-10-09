# delivery-zones

## Purpose

Delivery pricing by city. Each zone holds a list of cities and three fees: the standard delivery fee, the order total above which delivery is free, and the cash-on-delivery handling fee. One zone is always the default for any city not listed.

## Structure

- `delivery-zone.routes.ts` — `/api/delivery-zones`. Public: `GET /` (every zone, served from the Redis response cache) and `GET /cities` (city search). Admin (`platformGuards.ordersRead` / `ordersManage`): `GET /history`, `POST /`, `PATCH /:zoneId`, `PATCH /:zoneId/default`, and `DELETE /:zoneId`. Every write reloads the public cache straight away (`refreshCacheOnWrite`).
- `delivery-zone.controller.ts` — reads validated input and the admin principal, and sends the response.
- `delivery-zone.service.ts` — `deliveryZoneService`: the public list and city search, `resolveFeeValuesForCity` (used by `../cart` and `../orders` checkout), create/update/set-default/delete, and the change history.
- `delivery-zone.repository.ts` — `deliveryZoneRepository`: Prisma queries, including the history writes.
- `delivery-zone.utils.ts` — `normalizeCityName` (trimmed, lower-case) and the view, fee and history-snapshot mappers.
- `delivery-zone.schemas.ts`, `delivery-zone.types.ts` — request validation and shapes.

## Funnel

**User-facing:** an admin sets up zones in the admin app, lists the cities in each, sets the fees, and marks one zone as the default. A shopper's cart and checkout show the delivery fee for the city they enter, and the zone's free-delivery threshold.

**Technical:** admin `delivery-zones` feature → `delivery-zone.routes.ts` → `delivery-zone.controller.ts` → `deliveryZoneService` → `deliveryZoneRepository` → Postgres via Prisma. At checkout, `../cart/cart.service.ts` and `../orders/checkout/checkout.service.ts` call `deliveryZoneService.resolveFeeValuesForCity(city)`.

## Non-obvious rationale

- **There is always exactly one default zone.** The first zone ever created becomes the default automatically. The default can't be deleted (`409 DEFAULT_ZONE_UNDELETABLE`); another zone has to be made the default first. A city with no zone, or no city at all, gets the default zone's fees.
- **A city belongs to at most one zone, enforced by the database.** City names are normalised before they're stored and looked up, and a unique constraint backs them. A clash becomes `409 CITY_ALREADY_ASSIGNED` instead of a read-then-write check that could race.
- **Every change is recorded.** Updating a zone, or moving the default, writes a history row with the admin, the old values and the new values in the same transaction as the change. Moving the default records both zones.
