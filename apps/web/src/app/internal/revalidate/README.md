# internal/revalidate

## Purpose

`POST /internal/revalidate` — the endpoint `apps/api` calls after an admin edits a resource the
web app caches (categories, product types, hero slides, homepage collections), so the change
shows up on the next render instead of waiting for the fetch's time-based `revalidate` window.

## Structure

- `route.ts` — the handler. Bearer-secret auth, tag allowlist check, then `revalidateTag` per
  tag. `dynamic = "force-dynamic"` so it is never prerendered or cached.
- Tag names and their type guard come from `@outfiqe/utils` (`WEB_REVALIDATE_TAGS`,
  `isWebRevalidateTag`) — the same constant the server fetch helpers tag their requests with.

## Funnel

Technical: admin saves a change in `apps/admin` → `apps/api` write route succeeds → api posts
`{ tags: [...] }` here with `Authorization: Bearer <REVALIDATE_SECRET>` → this handler expires
each tag → the next visitor's home-page render refetches that resource from the api.

## Non-obvious rationale

- **`revalidateTag(tag, { expire: 0 })`, not `"max"`.** Next 16's docs recommend `"max"` for
  the common case (mark stale, serve stale-while-revalidate). But the invalidation here comes
  from another service, and an admin who just hit "save" should see the change on their very
  next load, not one stale render later. `{ expire: 0 }` is the documented form for that
  "external caller, no stale window" case; `updateTag` is not an option because it only works
  inside a Server Action.
- **Not under `/api/*`.** `next.config.ts` rewrites `/api/:path*` to the Express backend, so a
  route handler there would never run — hence `/internal/revalidate`.
- **Bearer secret, constant-time compared.** The endpoint only triggers cache misses, so the
  worst an attacker with the secret can do is force recomputation (mild), but the check is still
  timing-safe and unset-secret returns 503 rather than silently allowing calls.
- **The fetch helpers keep their `revalidate` window.** This endpoint is the fast path; the
  time window in `serverCacheTags.ts` is the backstop for a dropped or failed call.
