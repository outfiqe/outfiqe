# Withdraw policy

## Purpose

The versioned policy editor for withdrawal min/max amounts, request windows, attempts, cooldown,
and processing-time copy — one tab per `ownerType` (Creator / Business). See
`apps/api/src/modules/withdraw/README.md` for why there are two separate policy rows instead of
one shared record.

## Structure

- `api.ts` / `schemas.ts` — `GET /withdraw/policy?ownerType=`, `PUT /withdraw/admin/policy`.
- `WithdrawPolicyPage.tsx` — the tab switch plus the form (`PolicyForm`, a local component keyed
  by `ownerType` so switching tabs discards any unsaved edits rather than merging them).

## Funnel

**Admin-facing:** pick Creator or Business, edit the fields, save. Saving creates a new active
policy version server-side (see the API README) — this page just always shows whatever the
server currently reports as active for that `ownerType`.

## Non-obvious rationale

**`PUT` needed adding to the shared `@outfiqe/client` API client** — every other admin/web
mutation in this codebase is a `POST`/`PATCH`, so `put` didn't exist on the shared client yet.
Added it the same way `get`/`post`/`patch`/`del` are already implemented, since `PUT
/withdraw/admin/policy` (a full-replace of the active policy, matching REST conventions for
"replace this resource") was already built and tested on the API side in an earlier chunk.
