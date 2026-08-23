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
- `resolveNotificationHref.ts` — admin only ever receives `BRAND_APPLICATION_SUBMITTED` (plan §5);
  every other `NotificationType` is listed explicitly as `null` rather than falling through a
  default case, so a future admin-facing type is a deliberate addition to this switch.

## Funnel

**User-facing:** any signed-in admin sees the bell in the app header; clicking a brand-application
notification navigates to `/`, where `BrandApplicationsPage` lives.

**Technical:** same shape as `apps/web`'s wiring — `AdminNotificationBell` acquires the socket on
mount, hands it to `NotificationBell`, which keeps the panel's react-query cache in sync via
`useNotificationSocket`.
