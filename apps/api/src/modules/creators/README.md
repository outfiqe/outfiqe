# Creators

## Purpose

Creator applications (a `User` opting in to become a creator), the admin approve/reject queue, and public creator profile/discovery reads — `GET /creators/by-handle/:handle`, its posts, and `GET /creators/search`. Creator _content_ (posts, likes, comments) is owned by `../creator-looks`; this module owns the creator as a person/account.

## Structure

- `creator.service.ts` — `apply`/`getMine`/`updateMe` (a user's own creator profile), `getPublicProfile`/`listLooksByHandle` (public reads), `search` (public discovery), `list`/`approve`/`reject` (admin queue).
- `creator.controller.ts`, `creator.routes.ts` — thin HTTP layer. `POST /creators/apply`, `GET/PATCH /creators/me` need auth; `GET /creators/by-handle/:handle`(`/looks`) and `GET /creators/search` are public; `GET /creators` (the admin queue) and `POST /:userId/approve`/`reject` require `ADMIN`.
- `creator.schemas.ts` — zod schemas + inferred query/body types.
- `creator.types.ts`, `creator.utils.ts` — `CreatorProfile` (own profile, includes `email`), `PublicCreatorProfile` (full profile page), `CreatorSearchResult` (search-card shape) and the `UserRecord → *` mappers (`toProfile`, `toSearchResult`).
- No local `creator.repository.ts` — this module reads/writes the `users` table directly through `../users/user.repository.ts` (`userRepository`) rather than duplicating a second data-access layer over the same table; `creator.service.ts` is the only place that turns those raw `UserRecord`s into creator-shaped responses.

## Funnel

**User-facing:** a signed-in customer applies via their dashboard → `creatorStatus` goes `NONE → PENDING`, sitting in the admin's approve/reject queue → once `APPROVED`, `isCreator` flips true and their `/creator/:handle` profile and posts become publicly visible. Anyone (signed in or not) can search for a creator by name or handle from `/explore/search` (see `apps/web/src/features/search/README.md`).

**Technical:** `creator.service.search` calls `userRepository.searchCreatorIds` (`Prisma.$queryRaw` against the hand-written `search_creators` Postgres function — see `../products/README.md` for the general pg_trgm/full-text pattern this follows), then `userRepository.findManyByIds` to hydrate full rows in ranked order, same ids-then-hydrate shape `../products/product.service.ts` and `../creator-looks/creatorLook.repository.ts` (`searchLooks`) both use. Offset-based pagination via `encodeCursor`/`decodeCursor` (`#lib/pagination.utils.js`), same as product search — rank isn't a stable column to keyset-paginate on.

## Non-obvious rationale

`search_creators` (migration `20260818150000_add_creator_and_look_search`, tuned in `20260818153000_tune_creator_search_trigram_threshold`) only matches `handle`/`name`, filtered to `is_creator = true AND creator_status = 'APPROVED'` — there's no bio/description field on `User` to weight in, unlike products' brand/category join. It uses a **higher** trigram threshold (`0.5`) than product search's `0.4`: names and handles are short, mostly single tokens, so the same threshold that correctly separated real product typos from noise let through real false positives here — searching "kastha" matched "Sabin **Shrestha**" at a `word_similarity` of `0.43`, well above product search's `0.4` cutoff but nowhere near a genuine typo match (`0.75`+ in this same dataset for an actual near-miss spelling). Mismatching a person's account reads worse than mismatching a product, so this module errs further toward precision.

Creator search results don't carry `isFollowing` or a Follow button (`../follows` already has a _different_ existing endpoint, `GET /follows/suggested-creators`, for the "who to follow" sidebar rail, which by construction excludes people you already follow — search doesn't have that guarantee). Adding a Follow action here needs `isFollowing` threaded through `search_creators`/`CreatorSearchResult` first, which hasn't been done — the search card links to the creator's profile instead, where following already works correctly.
