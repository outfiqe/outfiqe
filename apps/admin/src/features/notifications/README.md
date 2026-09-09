# notifications

## Purpose

Wires the shared `NotificationBell` (`@outfiqe/components`) into `apps/admin`: the notifications
API client, the socket connection it listens on, and the navigation the bell performs on a click.
Everything else (bell, panel, pagination, mute preferences, cache logic) lives in the shared
packages.

## Structure

- `AdminNotificationBell.tsx` — mounted in `apps/admin/src/components/AppShell.tsx`'s header, next
  to `ThemeToggle`/`AccountMenu`. Always renders (`AppShell` only mounts inside the authenticated
  route tree, unlike `apps/web`'s header, which is also public — no auth gate needed here).
  Subscribes to `apps/admin/src/lib/socketClient.ts`'s connection via `useSyncExternalStore` (see
  `apps/web/src/features/notifications/README.md` for why, not `useState` + `useEffect`).
- `AdminNotificationBell.tsx`'s select handler navigates by the API-stored destination: an
  `ADMIN`-surface `targetPath` goes through `navigate({ href })` (client-side, TanStack resolves
  the concrete path against the route tree), and a `WEB`-surface one is a full-page
  `window.location.assign(${VITE_WEB_URL}${targetPath})` — a DM or wallet notification an admin
  receives lives only on `outfiqe.com`.
- `resolveNotificationHref.ts` — the old per-`type` → `{ to, params }` resolver, kept only as the
  fallback for notifications created before the API started stamping `targetSurface`/`targetPath`.
  Removed once the backfill has run.

## Funnel

**User-facing:** any signed-in admin sees the bell in the app header. A brand-application
notification opens `/platform/brand-applications`; a support-ticket notification opens
`/support/{ticketId}` (or the `/support` inbox with no ticket id); a CRM assignment opens
`/crm/support` or `/crm/tasks` by `metadata.crmItemKind`; a coupon alert opens `/coupons`, and a
flagged redemption opens the order it came from. All of those paths are resolved and stored by the
API when the notification is written (`apps/api/src/modules/notifications/notification.targets.ts`).

**Technical:** same shape as `apps/web`'s wiring — `AdminNotificationBell` acquires the socket on
mount, hands it to `NotificationBell`, which keeps the panel's react-query cache in sync via
`useNotificationSocket`.
