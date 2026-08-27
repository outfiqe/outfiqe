# Users

## Purpose

The `User` record itself — creation, lookup, and self-service profile updates. Registration, login, and session issuance live in `../auth`; this module owns the row those flows read and write.

## Structure

- `user.controller.ts`, `user.routes.ts` — `POST /` (admin-only user creation), `PATCH /me` (`requireAuth`, self-service profile update), `GET /` and `GET /:id` (admin-only listing/lookup), `GET /search?q=` (admin-only, name/handle typeahead — see rationale below).
- `user.schemas.ts` — zod validation: `createUserSchema`, `updateOwnProfileSchema` (`name`/`phone`/`avatarUrl`, all optional — a partial patch, not a full replace), `userIdParamSchema`, `searchUsersQuerySchema`.
- `user.repository.ts` — `userRepository`, the `User` persistence layer: `create`, `createOAuthOnlyUser` (see `../auth/oauth`), `findByEmail`/`findByPhone`/`findById`/`findByHandle`, `list`/`search`/`findManyByIds`/`searchCreatorIds`/`listByCreatorStatus`, `updateProfile`, `markEmailVerified`, `updatePasswordHash`, `updateCreatorStatus`, `updateLastSeenAt`/`findLastSeenAtByIds` (written by `../chat`'s presence tracking on socket disconnect — see `../chat/README.md`, not by this module itself).
- `user.service.ts` — `userService.createUser`/`getUser`/`listUsers`/`searchUsers`/`updateMe`.
- `user.types.ts` — `UserRecord`, `CreateUserInput`, `UpdateUserProfileInput`, `PublicUser`, `UserSearchResult`.
- `user.utils.ts` — `toPublicUser`, strips internal fields (`passwordHash`, `phone`, etc.) before a user record reaches an API response.

## Funnel

**User-facing:** a signed-in user can update their display name and, if they don't have one yet, add a phone number — from Account Settings (`../auth/oauth`'s Security page nudges an OAuth-only account to add one, since OAuth sign-up never collects one). Admins can list/create/inspect users through the same `PATCH /me`-adjacent routes, gated by `requireRole(ADMIN)`.

**Technical:** `user.routes.ts` → `user.controller.ts` → `user.service.ts` → `user.repository.ts` → Prisma. `updateMe` checks phone uniqueness itself (`findByPhone`, excluding the caller's own row) before writing, rather than relying on the DB's `@unique` constraint and catching the violation — same find-then-write pattern `../auth/auth.service.ts` already uses for registration, so a conflict comes back as the same `PHONE_EXISTS` 409 everywhere in the app instead of a raw constraint-violation error surfacing from one path and not another.

## Non-obvious rationale

**`GET /users/search` is an all-users typeahead (`name`/`handle` case-insensitive `contains`, capped at 10, followers-first), distinct from `../creators`' creator-only `search_creators()`.** `../gamification`'s Manual Actions (hand-award a badge, grant/dock XP) can target *any* user, not just creators — a shopper or brand owner too — so the creator-scoped search isn't enough, and it's cheap: the `users_name_trgm_idx`/`users_handle_trgm_idx` GIN trigram indexes back the `ILIKE '%…%'` Prisma generates. It returns only `id`/`name`/`handle`/`avatarUrl` — never `email`/`phone` — since the admin UI just needs to pick a row and submit its id. Route order in `user.routes.ts` puts `/search` before `/:id` so the literal path wins over the uuid param.

`updateOwnProfileSchema`'s `phone` field only ever sets a phone, never clears one — reusing the same `phoneSchema` regex validator registration uses (`#lib/phone.utils.js`), which requires an actual valid number. There's no "remove my phone number" affordance in this endpoint; `UserRecord.phone` being nullable (see `../auth/README.md`) exists to support OAuth-only accounts that never had one, not to let an existing phone be cleared.

## Follow-ups

- `user.integration.test.ts` covers `updateMe` (the behavior this module's most recent change added) but not `createUser`/`getUser`/`listUsers` — those three predate this test file and were already untested; adding coverage for them is a natural next step, not done here since it's outside what this change touched. `user.service.ts` is in `vitest.config.ts`'s `coverage.include`, so its per-file number in a coverage report reflects that gap honestly — the repo-wide 80% gate is checked in aggregate, not per file, so this doesn't fail the build.
