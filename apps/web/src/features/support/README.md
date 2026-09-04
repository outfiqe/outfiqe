# support

## Purpose

The customer side of the support flow: a signed-in shopper, creator or brand raises a request and
follows every reply, backed by `apps/api`'s `support` module. Staff handling happens in
`apps/admin`.

## Structure

- `schemas/support.schema.ts` — Zod for the form + the API responses, plus the customer-facing
  `CATEGORY_LABELS` / `STATUS_LABELS` (softer wording than the admin labels).
- `api/supportApi.ts` — `/support/tickets{,/mine,/mine/:id/messages}` and `/support/reopen/:token`.
- `hooks/useSupportRequests.ts` — `useSubmitSupportRequest`, `useMySupportRequests` (cursor
  paginated), `useSupportRequestThread`, `useReplyToSupportRequest`.
- `components/SupportRequestForm.tsx` — react-hook-form + zod: category, subject, message. Shows
  the `OFQ-…` reference on success. Takes `defaultCategory` / `relatedOrderId` for prefilled entry
  points.
- `components/SupportRequestsView.tsx` — the account view: list &harr; new-request form &harr;
  thread, driven by a `?ticket=` search param so a notification can deep-link straight to a thread.
- `components/SupportThread.tsx` — the read-only thread + inline reply box (hidden when closed).

## Funnel

**User-facing:** from `/help` ("Still need help?"), `/contact` ("Order help"), or directly, a
signed-in user lands on `/support`, hits "New request", and submits. They get an acknowledgement
email and see the request in the list. A staff reply arrives by email and appears in the thread;
replying there reopens the request. A resolved request's email links to `/support/reopen?token=…`,
a small public page that POSTs the token.

**Technical:** page (`app/support`) &rarr; `SupportRequestsView` &rarr; `hooks/useSupportRequests`
&rarr; `api/supportApi` &rarr; `/api/support/tickets/mine*`.

## Non-obvious rationale

- **`/support` is a standalone page (site header + footer, no dashboard nav rail), not part of
  `(dashboard)`.** It's just a request list and thread view — the dashboard chrome added nothing.
  It still gates on a session (`getServerSessionWithToken`): logged-out users are bounced to
  sign-in and back, admins are sent to the admin console. Guest (no-account) support is PRD M3.
- **`/support/reopen` is a separate public route** — the reopen token is the only credential, so
  that page can't sit behind the session guard.
