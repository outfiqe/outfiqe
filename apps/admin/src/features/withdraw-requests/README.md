# Withdraw requests

## Purpose

The admin review queue for creator and business withdrawal requests: approve, reject, or mark
paid. See `apps/api/src/modules/withdraw/README.md` for the hard rules this UI enforces
(identity cross-check on a bank account's first payout, two-admin sign-off above the soft
ceiling).

## Structure

- `api.ts` / `schemas.ts` — `GET /withdraw/admin/requests`, `PATCH /:id/approve|reject|mark-paid`.
- `hooks/useInfiniteWithdrawRequests.ts` — the paginated, status-tabbed queue.
- `WithdrawRequestsListSection.tsx` — the queue: tabs by status, per-row actions.
- `WithdrawRequestsPage.tsx` — the route's top-level wrapper.

## Funnel

**Admin-facing:** filter by status, approve/reject/mark-paid a request from its row. Reject and
mark-paid prompt for a reason/reference via `window.prompt`, matching this app's existing
`commissions` feature's lightweight action pattern rather than introducing a modal for a single
text field.

## Non-obvious rationale

**Approving doesn't ask for the identity cross-check confirmation up front — it tries the plain
approve first, and only asks (`window.confirm`) if the backend responds
`IDENTITY_CROSS_CHECK_REQUIRED`.** Most approvals are _not_ a bank account's first payout, so
asking every time would be a needless extra click for the common case; the backend already knows
whether this particular account needs it, so the UI defers to that instead of duplicating the
"has this account been paid before" check client-side.

**The same "Approve" button handles both a normal single-call approval and a soft-ceiling
request's first-or-second sign-off** — the backend's state machine (`withdraw.service.ts`)
already decides which transition applies from the request's current `status`/
`firstApprovedById`; the UI doesn't need to special-case it beyond showing the explanatory note
and letting a same-admin double-click fail with the backend's own `SAME_ADMIN_SIGN_OFF` error.
