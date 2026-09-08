# notifications

## Purpose

Wires the shared `NotificationBell` (`@outfiqe/components`) into `apps/admin`: the notifications
API client, the socket connection it listens on, and admin's own `type -> route` redirect resolver.
Everything else (bell, panel, pagination, mute preferences, cache logic) lives in the shared
packages.

## Structure

- `AdminNotificationBell.tsx` — mounted in `apps/admin/src/components/AppShell.tsx`'s header, next
  to `ThemeToggle`/`AccountMenu`. Always renders (`AppShell` only mounts inside the authenticated
  route tree, unlike `apps/web`'s header, which is also public — no auth gate needed here).
  Subscribes to `apps/admin/src/lib/socketClient.ts`'s connection via `useSyncExternalStore` (see
  `apps/web/src/features/notifications/README.md` for why, not `useState` + `useEffect`).
- `resolveNotificationHref.ts` — admin-facing types are `BRAND_APPLICATION_SUBMITTED`, all four
  `SUPPORT_TICKET_*` events (`RESOLVED` included — it deep-links to the thread so the admin can
  reopen it), `CRM_ITEM_ASSIGNED`, and the three `COUPON_*` alerts (`COUPON_APPROVAL_REQUESTED`/
  `COUPON_BUDGET_ALERT` → `/coupons`, `COUPON_REDEMPTION_FLAGGED` → that order's detail page when
  an `entityId` is present). Every other `NotificationType` is listed explicitly as `null` rather
  than falling through a default case, so a future admin-facing type is a deliberate addition to
  this switch. It returns a TanStack Router navigate target (`{ to }`, plus `params` for the
  `/support/$ticketId` and `/orders/$orderId` routes) — not a pre-built path string — because
  `AdminNotificationBell` passes the result straight to `navigate()`, which resolves `$` segments
  from `params` and would otherwise drop an interpolated path onto the `$.tsx` not-found route.
  Route path literals live in the `AdminNotificationTarget` union so a typo is a type error, not a
  silent not-found redirect.

## Funnel

**User-facing:** any signed-in admin sees the bell in the app header; clicking a brand-application
notification navigates to `/platform/brand-applications`, where `BrandApplicationsPage` lives
(the `/` index just redirects to `/platform` or `/crm`, so it is not a valid destination);
clicking any support-ticket notification opens `/support/{ticketId}` (falling back to the
`/support` inbox when no ticket id is on the notification); clicking a CRM assignment notification
navigates to `/crm/support` (tickets) or `/crm/tasks` (tasks) based on `metadata.crmItemKind` —
neither CRM list page yet supports deep-linking to the specific row, so that's as far as the click
can take you today; clicking a coupon alert opens `/coupons`, and a flagged redemption opens the
order it came from.

**Technical:** same shape as `apps/web`'s wiring — `AdminNotificationBell` acquires the socket on
mount, hands it to `NotificationBell`, which keeps the panel's react-query cache in sync via
`useNotificationSocket`.
