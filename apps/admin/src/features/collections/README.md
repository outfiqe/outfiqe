# collections

## Purpose

Lets the team create the curated product collections shoppers browse on the web app, publish or hide them, set their cover, and choose which products each one shows, in order.

## Structure

- `api/collectionsApi.ts` — every call this page makes: list collections (`GET /collections/admin`), create, publish/hide and update the cover (`PATCH /collections/:id`), read and replace a collection's products (`GET /collections/admin/:id/products`, `PATCH /collections/:id/products`), and the product search used by the picker.
- `api/collectionsSchemas.ts` — Zod schemas for those responses.
- `components/CollectionsPage.tsx` — the page: the collection list, the create form and the per-collection actions.
- `components/ProductPicker.tsx` — searches products and builds the ordered list a collection shows.
- `schemas/collectionForm.schema.ts` — validation for the create form (unit-tested beside it).

## Funnel

**User-facing:** an admin opens Collections, creates one with a name and slug, uploads a cover, picks and orders its products, then publishes it. Shoppers see it on the web app straight away.

**Technical:** `routes/_authenticated.collections.tsx` → `components/CollectionsPage.tsx` → `api/collectionsApi.ts` → `apiClient` → `/api/collections` in `apps/api/src/modules/collections`.
