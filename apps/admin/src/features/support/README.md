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
  `useSupportAgents`, and the reply/status/assign/priority mutations (each caches the returned
  thread, invalidates the inbox + stats, and toasts).
- `support.constants.ts` — status/category/segment/priority label maps and status `Badge` tones.
- `SupportInboxPage.tsx` — stat cards, the filter row (assignee incl. "me" / unassigned, status,
  category, subject search), and the cursor-paginated list. Each row links to the ticket.
- `SupportTicketPage.tsx` — the thread (customer / staff / internal-note styled distinctly), the
  reply composer with a **Reply to customer** / **Internal note** toggle, and a right rail with
  legal-only status buttons, the assignee `Select`, priority, and a requester-context card.
- Routes: `routes/_authenticated.support.index.tsx` and `_authenticated.support.$ticketId.tsx`.
  The sidebar entry is in `components/AdminSidebar.tsx` (`PLATFORM_NAV_ITEMS`, key `support`).

## Funnel

**User-facing:** a support notification in the header bell deep-links to the ticket. Staff claim
it (status auto-moves `NEW &rarr; OPEN`), reply (emailed to the customer) or add an internal note,
move status, and resolve (sends the customer a closing email with a reopen link).

**Technical:** page &rarr; `hooks.ts` &rarr; `api.ts` &rarr; `/api/support/admin/*`. The status
buttons post `{ status, expectedStatus }` so a concurrent change from another agent fails with a
clear conflict rather than clobbering.

## Non-obvious rationale

- **The transition map is duplicated here from the API's `support.constants.ts`** so the ticket
  page can grey out illegal status moves without a round-trip. The server still enforces it —
  this copy is a UX affordance, not the authority.
- **The assignee dropdown lists every `UserRole.ADMIN`** (`GET /support/admin/agents`). Only
  `platform:support:manage` holders can actually assign to someone other than themselves; a
  non-manager who tries gets a server `403` surfaced as a toast, rather than the option being
  hidden (the client has no fine-grained key list).
