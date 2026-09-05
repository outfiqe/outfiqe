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
- `resolveNotificationHref.ts` — admin-facing types are `BRAND_APPLICATION_SUBMITTED`,
  `SUPPORT_TICKET_CREATED`/`SUPPORT_TICKET_ASSIGNED`/`SUPPORT_TICKET_REPLY`, and
  `CRM_ITEM_ASSIGNED`; every other `NotificationType` is listed explicitly as `null` rather than
  falling through a default case, so a future admin-facing type is a deliberate addition to this
  switch.

## Funnel

**User-facing:** any signed-in admin sees the bell in the app header; clicking a brand-application
notification navigates to `/`, where `BrandApplicationsPage` lives; clicking a support-ticket
notification navigates to `/support` (or `/support/{ticketId}` when one is known); clicking a
CRM assignment notification navigates to `/crm/support` (tickets) or `/crm/tasks` (tasks) based on
`metadata.crmItemKind` — neither CRM list page yet supports deep-linking to the specific row, so
that's as far as the click can take you today.

**Technical:** same shape as `apps/web`'s wiring — `AdminNotificationBell` acquires the socket on
mount, hands it to `NotificationBell`, which keeps the panel's react-query cache in sync via
`useNotificationSocket`.
