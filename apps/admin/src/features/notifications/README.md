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
  receives lives only on `outfiqe.com`. An absolute link (a CRM assignment's tenant-qualified URL)
  that points into this same admin app opens in place. Any other absolute link opens in a new tab.
- `adminNotificationBell.utils.ts` — `toSameOriginAdminHref` (turns a same-origin `/admin/...` URL
  into an in-app path) and `belongsToTenant` (the tenant bell's live-update filter).
- `apps/admin/src/lib/notificationsApi.ts` — the bell's API client. On a tenant subdomain it asks
  the API for `scope=tenant`, so the feed, unread count and "mark all as read" cover only that
  tenant.
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
On a tenant subdomain the bell lists only that tenant's CRM notifications. Storefront activity
(likes, orders, messages) stays in the storefront's own bell.

**Technical:** same shape as `apps/web`'s wiring — `AdminNotificationBell` acquires the socket on
mount, hands it to `NotificationBell`, which keeps the panel's react-query cache in sync via
`useNotificationSocket`. On a tenant host, the bell also reads the shared `["crm-organization"]`
query to learn the tenant's id. It passes `belongsToTenant(id)` as `acceptsNotification`, so live
socket events for other tenants or for the storefront never enter the list.

## Non-obvious rationale

**The tenant filter runs in two places.** The API filters the REST feed by the request's host,
which is the source of truth. The socket, though, delivers every notification for the user,
because it has one room per user, not per tenant. So the bell drops live events whose
`organizationId` isn't this tenant's. Until the tenant's id has loaded, the filter accepts nothing
rather than everything. Anything held back appears on the next fetch.
