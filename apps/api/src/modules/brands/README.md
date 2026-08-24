# Brands

## Purpose

Public reads for brand profiles — the browse-brands list, a single brand's public profile, and its approved products — plus a brand owner's self-service view/edit of their own profile. Brand _creation_ itself lives in `brand-applications` (an application gets reviewed and approved into a `Brand` row); this module only reads and lightly edits brands that already exist.

## Structure

- `brand.routes.ts` — `GET /` (public list, optional auth), `GET /me` / `PATCH /me` (brand owner only), `GET /:id` (public profile), `GET /:id/products` (public).
- `brand.controller.ts` — thin request/response glue.
- `brand.service.ts` — `listPublic` (paginated browse), `getPublicProfile`, `getMyBrand`/`updateMyBrand`.
- `brand.repository.ts` — Prisma queries; `listPublic`/`countAll` support an optional case-insensitive `q` name filter, `findManyByIds` is the same filter applied to a known id set.
- `brand.utils.ts` — `toPublicBrandProfile`, the one mapper from a full `Brand` row (+ derived product/follow/contact-user info) to the public-safe shape (id/name/avatarUrl/bannerUrl/madeInNepal/rating/productCount/followerCount/isFollowing/contactUserId) — never the row's contact email/phone/instagram.
- `brand.types.ts` / `brand.schemas.ts` — types and Zod validation for the above.

## Funnel

**User-facing:** `/brands` browses all brands (cards, follow status if signed in); `/brand/:id` shows one brand's public profile and product grid.

**Technical:** `GET /api/brands?q=...` → `brandService.listPublic` → `brandRepository.listPublic`/`countAll` (both accept the same optional `q`) → `toPublicBrandProfile` per row. `GET /api/brands/:id` → `brandService.getPublicProfile` → `brandRepository.findById` + product/follow counts → `toPublicBrandProfile`.

## Non-obvious rationale

**`contactUserId` on the public profile (only, not the list) is the brand's `BrandMembership{role:
OWNER}` user id** (`brandRepository.findOwnerUserId`), added for `apps/web`'s "Message" button on a
brand's profile page (`apps/web/src/features/messaging/README.md`) — chat participants are always
`User`s, and a brand can have multiple staff, so this resolves who actually receives the message.
It's `null` if no owner membership exists yet, and it's only fetched for the single-profile
endpoint (`getPublicProfile`), not `listPublic`, to avoid an extra query per row on the browse grid
where nothing needs it.

**`q` on the public list endpoint doubles as the admin gamification sponsor-brand picker's search** (`apps/admin/src/features/gamification/BadgesSection/BrandSponsorField.tsx`, `apps/api/src/modules/badges`) rather than a second, admin-only "search brands" endpoint. The picker only ever needs a small set of public-safe fields (id/name/avatarUrl) to let an admin attach a sponsor to a badge, and this endpoint already returns exactly that, already paginated, already tested — a parallel lite endpoint would just be the same query with less code reuse. `countAll` takes the same `q` so a future caller that reads `.total` against a filtered list gets a consistent number, even though today's only consumers (the browse page, the sponsor picker) don't read it.
