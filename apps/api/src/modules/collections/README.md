# collections

## Purpose

Hand-picked product collections (for example "Monsoon Edit") that the team curates in the admin app and shoppers browse on the web app.

## Structure

- `collection.routes.ts` — `/api/collections`. Public: `GET /` (published collections), `GET /:slug` and `GET /:slug/products`. Admin (`platformGuards.catalogRead` to read, `catalogManage` to write): `GET /admin`, `GET /admin/:id/products`, `POST /`, `PATCH /:id`, and `PATCH /:id/products`. Every write also triggers a web cache refresh for the collections tag (`revalidateWebCacheOnWrite`).
- `collection.controller.ts` — reads validated input and sends the response.
- `collection.service.ts` — `collectionService`: create and update (a duplicate slug becomes `409 SLUG_TAKEN`), replace a collection's products, the admin lists, and the public cursor-paged lists.
- `collection.repository.ts` — `collectionRepository`: Prisma queries.
- `collection.schemas.ts`, `collection.types.ts` — request validation and response shapes.
- `collection.utils.ts` — `toPublicCollection`, the public response mapper.
- `collection.responsive-image.integration.test.ts` — the collection cover image's responsive variants.

## Funnel

**User-facing:** an admin creates a collection with a title, slug and cover, picks its products in order, and publishes it. Shoppers see published collections on the web app, open one by its slug, and scroll through its products.

**Technical:** web `collections` / admin `collections` features → `collection.routes.ts` → `collection.controller.ts` → `collectionService` → `collectionRepository` → Postgres via Prisma.

## Non-obvious rationale

- **Only approved products ever show, and the counts agree.** Public product lists and every product count filter on `ProductStatus.APPROVED`, so a product that is later rejected or pending review drops out of a collection without anyone editing it.
- **Setting products replaces the whole list in one transaction.** `setProducts` deletes the old links and inserts the new ones in a single `$transaction`, storing each product's position as `sortOrder`. A failure leaves the previous list untouched rather than half-replaced.
- **Only published collections are public.** Drafts are visible only through the `/admin` routes.
