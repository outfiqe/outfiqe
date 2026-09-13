# Announcements (admin)

## Purpose

The admin control surface for broadcast announcements (`apps/api/src/modules/announcements`) — compose
a draft, see a live recipient-count estimate, send it immediately or schedule it, and cancel a
still-pending one.

## Structure

- `api.ts` — `announcementsApi`: `list` (status-filterable, paginated), `create`, `update`, `send`,
  `cancel`.
- `schemas.ts` — Zod response schema (`announcementSchema`) and the plain input types the
  create/update/send calls send.
- `hooks/useInfiniteAnnouncements.ts` — `useInfiniteCursorPage` wrapper, same pattern as `coupons`/
  `withdraw-requests`.
- `AnnouncementsPage.tsx` — the routed page (`/announcements`).
- `AnnouncementsListSection.tsx` — status tabs (URL-bound via `@/lib/useSearchFilter` as `?status=`,
  default `DRAFT`), the announcement list, and the per-status actions (Edit/Send/Discard for a draft,
  Cancel for a scheduled one).
- `ComposeAnnouncementModal.tsx` — the draft composer: title, body, an `@outfiqe/design-system`
  `MultiSelect` over the five audience segments, a call-to-action mode (none/internal/external), and an
  optional expiry date. Shows the `resolvedAudienceCount` the last save returned.
- `SendConfirmationModal.tsx` — the send/schedule decision in one modal, not two: it folds the PRD's
  "confirm before a large/Everyone send" requirement and the "choose when to send" step together, since
  they're one decision from the admin's point of view. Forces "Schedule" and disables "Send now" once
  the resolved audience is at or above the same 500-recipient threshold the backend enforces, so an
  admin can't hit a send action the server would reject anyway.

## Funnel

**User-facing:** an admin opens Announcements from the Platform nav section, drafts a message, sees
roughly how many people it'll reach, and sends it now or on a schedule — or discards/cancels it before
it goes out.

**Technical:** `AnnouncementsPage` → `AnnouncementsListSection` → `api.ts` →
`GET/POST/PATCH /api/admin/announcements/*` → `announcement.controller.ts` → `.service.ts`.

## Non-obvious rationale

- **The nav key is server-enforced** (`announcements` is in `SERVER_ENFORCED_PLATFORM_NAV_KEYS`,
  `packages/utils/src/platform-nav`) — an admin whose access to this section has been hidden via
  Navigation access loses the API routes too, not just the sidebar link, matching
  `coupons`/`withdraw-requests`/`financial-rollup`.
- **`SendConfirmationModal` mirrors the backend's own `ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS` as a local
  constant** rather than fetching it — the same pattern `CreateCouponModal`'s
  `COD_COUPON_VALUE_THRESHOLD` already uses for a UI-only threshold display. The server still enforces
  the real limit on `POST /:id/send`; this is purely to avoid presenting a "Send now" option the request
  would just 422 on.
