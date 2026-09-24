# support

## Purpose

The platform support inbox: staff with `platform:support:*` triage, reply to, assign and resolve
first-party support requests raised by shoppers, creators and brands. Backed by
`apps/api`'s `support` module.

## Structure

- `schemas.ts` — Zod for every API response plus the client-side copy of
  `ALLOWED_SUPPORT_TRANSITIONS` (so the ticket page only enables legal status moves).
- `api.ts` — the `/support/admin/*` client.
- `hooks.ts` — `useSupportInbox` (cursor-paginated), `useSupportTicket`, `useSupportStats`,
  `useSupportAgents`, and the reply/status/assign/priority mutations (each applies its change to
  the cached ticket optimistically, then caches the server's actual response, invalidates the
  inbox + stats, and toasts — see Non-obvious rationale for the rollback).
- `support.constants.ts` — status/category/segment/priority label maps and status `Badge` tones.
- `SupportInboxPage.tsx` — stat cards, the filter row, and the cursor-paginated list. Each row
  links to the ticket. The three fixed-set filters — assignee (`all` / `me` / `unassigned`),
  status and category — are URL-bound via `@/lib/useSearchFilter` (`?assignee=` / `?status=` /
  `?category=`, defaults omitted; `_authenticated.support.index.tsx` declares the `validateSearch`),
  so a filtered inbox survives a refresh and is a shareable link. The subject search box stays
  local component state for now.
- `SupportTicketPage.tsx` — the thread (customer / staff / internal-note styled distinctly), the
  reply composer with a **Reply to customer** / **Internal note** toggle, and a right rail with
  legal-only status buttons, the assignee `Select`, priority, and a requester-context card.
- Routes: `routes/_authenticated.support.index.tsx` and `_authenticated.support.$ticketId.tsx`.
  The sidebar entry is in `components/AdminSidebar.tsx` (`PLATFORM_NAV_ITEMS`, key `support`).

## Funnel

**User-facing:** a support notification in the header bell deep-links to the ticket. Staff claim
it (status auto-moves `NEW &rarr; OPEN`), reply (emailed to the customer) or add an internal note,
move status, and resolve (sends the customer a closing email with a reopen link).

**Technical:** page &rarr; `hooks.ts` &rarr; `api.ts` &rarr; `/api/support/admin/*`. The status,
assignee, and priority actions each post their new value plus the value the page currently has
(`expectedStatus` / `expectedAssigneeUserId` / `expectedPriority`) so a concurrent change from
another agent fails with a clear `409` rather than clobbering.

## Non-obvious rationale

- **The transition map is duplicated here from the API's `support.constants.ts`** so the ticket
  page can grey out illegal status moves without a round-trip. The server still enforces it —
  this copy is a UX affordance, not the authority.
- **The assignee dropdown lists every `UserRole.ADMIN`** (`GET /support/admin/agents`). Only
  `platform:support:manage` holders can actually assign to someone other than themselves; a
  non-manager who tries gets a server `403` surfaced as a toast, rather than the option being
  hidden (the client has no fine-grained key list).
- **Status/assignee/priority/reply all apply optimistically and roll back on failure**
  (`useTicketMutation`'s `onMutate`/`onError` in `hooks.ts`). Each click updates the ticket detail
  page's own React Query cache immediately — a status badge flips, the assignee `Select` shows the
  new value, a reply appears in the thread — before the server has answered, since the round trip
  otherwise makes the whole page feel like it's ignoring the click. `onMutate` snapshots the
  ticket first; if the mutation fails (most commonly the `409` from a stale `expected...` value,
  since another agent changed it first), `onError` restores that snapshot and the toast explains
  why, so the UI never ends up showing a change that didn't actually happen. The optimistic reply
  message gets a synthetic `optimistic-<timestamp>` id and no real author name (falls back to the
  generic "Support" label) since the real message, author, and id only exist once the server
  responds; `onSuccess` immediately replaces the whole cached ticket with that real response, so
  the placeholder is never visible for longer than the request takes.
