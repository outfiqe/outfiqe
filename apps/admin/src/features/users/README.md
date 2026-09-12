# Users (admin)

## Purpose

The admin-panel surface for account moderation: search for a user by name, username, or email,
see their current account status, and suspend, ban, or restore them. The first UI built on top of
`apps/api`'s `platform-suspensions` module — until this existed, those endpoints could only be
called directly.

## Structure

- `UsersPage.tsx` — the page: a search box driving the list, a status badge and inline
  suspend/ban/unsuspend/unban actions per row (hidden entirely for `ADMIN`-role accounts, which the
  API also refuses to moderate), and the two confirmation modals.
- `api.ts` — `usersApi`, the typed client for `GET /users` (search + cursor pagination) and the
  `platform-suspensions` action endpoints (`POST /platform/users/:id/suspend|ban|unsuspend|unban`).
- `hooks/useInfiniteUsers.ts` — wraps `usersApi.list` in the shared `useInfiniteCursorPage`,
  keyed by the (debounced) search term.
- `schemas.ts` — the `AdminUser`/`AccountStatus` Zod shapes returned by `GET /users`.
- `components/SuspendAccountModal.tsx` — reason (required) + duration (24h/7d/30d/indefinite).
- `components/BanAccountModal.tsx` — reason only; bans are always indefinite and, per the API,
  can only be lifted by a different admin than the one who imposed them.
- `UsersPage.integration.test.tsx` — colocated integration test; renders the page against a mocked
  API (MSW) and covers the search → suspend flow, a server-error surfacing inline, and that
  `ADMIN`-role rows never render a moderation action.

## Funnel

**User-facing:** an admin types into the search box; once results appear, each row shows the
person's name, handle, email, role, and a status pill (Active/Suspended/Banned) plus the current
reason and duration if not active. Suspend opens a modal for a reason and an optional duration;
Ban opens a similar modal with no duration field and a note that a different admin will be needed
to reverse it. Unsuspend/Lift ban act immediately, no modal — they're the low-friction "put it
back" actions. A failed action (e.g. trying to lift a ban you imposed yourself) shows the server's
message inline under that row rather than a toast, so it stays visible next to the account it's
about.

**Technical:** `UsersPage.tsx` → `useInfiniteUsers` (list) / direct `usersApi` calls (actions) →
the API client (`@/lib/apiClient`) → `apps/api`'s `users` module (`GET /users`) and
`platform-suspensions` module (the action endpoints). Every action invalidates the `["users"]`
query on success so the row's status refreshes from the server rather than being guessed
client-side.

## Non-obvious rationale

- **No default listing — search is required to see anyone.** `GET /users` has no upper bound on
  how many accounts exist, so this page never fetches "everyone"; it only queries once there's a
  search term, keeping the request bounded to whatever the admin is actually looking for.
- **This page only covers `User` moderation.** `platform-suspensions` also supports suspending a
  `Brand` (`POST /platform/brands/:id/suspend|unsuspend`) — freezing a business without touching
  its staff's individual accounts — but there's no "Brands" admin list page yet to build that UI
  on top of. Tracked as a follow-up, not built here.
