# creator-looks

## Purpose

Creator-posted "looks" (outfit photos with tagged products): posting, editing, deleting, the public explore feed, likes/saves/comments, tag-click attribution, and trending tags.

## Structure

- `creatorLook.routes.ts` — route table. Static/prefixed paths (`/feed`, `/tags/trending`, `/saved`) are registered before the `/:lookId`-shaped routes so Express doesn't swallow them.
- `creatorLook.controller.ts` — request/response glue; no business logic.
- `creatorLook.service.ts` — ownership checks, approval gating, worn-by recount orchestration, domain events.
- `creatorLook.repository.ts` — Prisma queries, cursor pagination, the Redis-cached trending snapshot/tags.
- `creatorLook.schemas.ts` — Zod request validation.
- `creatorLook.types.ts` — response/DTO shapes.
- `creatorLook.utils.ts` — cursor encode/decode and the `toSummary`/`toEditDetail` mappers.
- `creatorLook.socket.ts` — the `FEED_SYNC_REQUEST` socket handler (new-post count for the open feed tab).

## Funnel

**User-facing:** a creator posts a look with photos, a caption, and tagged products from their profile. Other users see it in the explore feed, can like/save/comment, and click a tag to jump to the product. The creator can edit the photos/caption/tags or delete the post from their own profile at any time.

**Technical:** `creator-profile`/`creator-dashboard` (web) → `creatorLook.routes` → `creatorLook.controller` → `creatorLook.service` → `creatorLook.repository` → Postgres via Prisma, with Redis caching the trending snapshot/tags.

## Non-obvious rationale

- **Soft delete only.** `CreatorLook.deletedAt` exists because `OrderItem.attributedLookId` can reference a look for commission history — deleting a look must never orphan a past order's attribution. `remove()` sets `deletedAt`; every read path already filters `deletedAt: null`.
- **`PATCH /:lookId` reuses `createCreatorLookSchema`** rather than a separate update schema — both now require the same full `imageUrls`/`caption`/`taggedProducts` shape, since editing replaces the whole set of images and tags rather than patching individual fields. `update()` fully replaces `CreatorLookImage`/`CreatorLookProduct`/`CreatorLookHashtag` rows for the look inside one transaction; the client is responsible for sending the complete surviving + newly-uploaded image URL list (existing images aren't re-cropped, only added/removed — see `creator-dashboard`'s README for why).
- **`GET/PATCH/DELETE /:lookId` are all owner-scoped**, not public. They 404 (not 403) when the look doesn't exist _or_ isn't owned by the caller, so a creator can't probe for other creators' look IDs.
- **`recountWornBy` is called per affected product ID**, not via `recountWornByForCreator`. That helper only recomputes for products the creator _currently_ tags — it would miss a product that was tagged and then fully untagged in an edit (or removed via delete), leaving its `wornByCount` stale. `update`/`remove` instead diff old vs. new tagged product IDs and recount each one directly, mirroring what `create` already does.
- **`GET /creator-looks` (`listFeaturedLooks`) returns full look posts, not products.** It used to dedupe `CreatorLookProduct` rows by `productId` ordered by `createdAt desc` — i.e. "whichever look tagged this product most recently" — and hand back bare product cards, discarding the look's photo/caption/creator/engagement entirely. It now finds, per tagged product, the single look with the highest `like_count*2 + comment_count + save_count` (via a raw `DISTINCT ON (product_id)`, since that per-group ranking isn't expressible through Prisma's declarative `orderBy`) and returns the hydrated `CreatorLookFeedPost` itself. A `GROUP BY look_id` on the outer query collapses the rare case where the same look happens to be the top pick for two different tagged products, so the homepage rail never shows the same photo twice. The cursor changed shape accordingly — it now encodes `{ engagement, lookId }` instead of a raw `CreatorLookProduct` UUID, so `listCreatorLooksQuerySchema.cursor` is a plain string, not `z.uuid()`.
