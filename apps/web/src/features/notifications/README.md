# notifications

## Purpose

Wires the shared `NotificationBell` (`@outfiqe/components`) into `apps/web`: the notifications API
client, the socket connection it listens on, and the navigation the bell performs on a click. The
bell, panel, pagination, mute preferences, and cache logic all live in the shared packages — this
feature only owns what's genuinely app-local (see the root `CLAUDE.md`'s Turborepo section).

## Structure

- `SiteNotificationBell.tsx` — mounted in `apps/web/src/components/SiteHeader.tsx`. Renders nothing
  for an unauthenticated visitor. Subscribes to the app's own `shared/lib/socketClient` connection
  via `useSyncExternalStore` (not `useState` + `useEffect` — see rationale below) and passes the
  wrapped socket, `notificationsApi`, and a select handler down to `NotificationBell`. The select
  handler calls `resolveNotificationNavigation` and then `router.push` for a same-app path or
  `window.location.assign` for one the resolver flags as `fullPage` (a cross-origin URL, or an
  `${ADMIN_URL}/…` path into the admin app).
- `resolveNotificationHref.ts` — `resolveNotificationNavigation(notification, ownHandle, isAdmin)`
  returns `{ href, fullPage }`. When the API stored a `targetPath` on the notification (the normal
  case — see `apps/api/src/modules/notifications/README.md`), it just prefixes an `ADMIN`-surface
  path with `ADMIN_URL` and marks it `fullPage`. `resolveNotificationHref` (the old per-`type`
  resolver) and `notificationRoutes.ts` are kept only as the fallback for notifications created
  before server-authored targets shipped, and go away once the backfill has run everywhere.

## Funnel

**User-facing:** any signed-in user sees the bell in the site header. Opening it shows their feed;
clicking a row marks it read and navigates to the destination the API stored on the notification.

**Technical:** `SiteNotificationBell` acquires the shared socket connection on mount (only once
authenticated), passes it to `NotificationBell`, which uses `useNotificationSocket` (`@outfiqe/hooks`)
to keep the react-query cache in sync with live `notification:created`/`updated`/`read`/`read-all`
events. The navigation is pure — everything it needs (`targetSurface`/`targetPath`, or the
denormalized `metadata` the legacy fallback reads) is already on the notification, plus the
`handle`/`isAdmin` the bell reads from `useAuth` for the fallback path.

## Non-obvious rationale

**The socket is read via `useSyncExternalStore`, not `useState` set inside a `useEffect`.** This
codebase's ESLint config enforces `react-hooks/set-state-in-effect` — calling `setSocket(...)`
synchronously in an effect body is flagged. `useSyncExternalStore` is the React-sanctioned way to
subscribe a component to an external, imperative resource (the socket singleton in
`shared/lib/socketClient.ts`) without that anti-pattern, and its `getServerSnapshot` argument
returns `null` so the socket is never touched during SSR.

**`resolveNotificationHref` deep-links `LOOK_LIKED`/`LOOK_COMMENTED` straight to the post**
(`/creator/{ownHandle}?look={lookId}`), not just the profile grid — see
`creator-profile/README.md`'s "Deep-linking a specific post" for how that param is consumed. Falls
back to the bare `/profile` only when the own handle isn't available yet (session still
loading) or the notification has no `entityId`. `NEW_FOLLOWER` links to the follower's own profile
(`metadata.recentActors[0].handle`, already denormalized by the write path) when known, falling
back to the dashboard profile otherwise.

**Why `resolveNotificationHref` needs the caller's own `handle` at all**: a `LOOK_LIKED`/
`LOOK_COMMENTED` notification is always about the recipient's _own_ look, but the notification
payload only denormalizes the _actor_ (who liked/commented), never the recipient — the recipient
already knows who they are. `auth.service.ts` added `handle` to `AuthUser`'s session payload
specifically to close this gap (see `apps/api/src/modules/auth/README.md`) rather than adding a
second API round-trip just to resolve one's own profile URL.

**Why some notifications leave this app.** An admin or support agent gets the same bell on
`outfiqe.com` as everyone else, but the admin console is a separate app under `ADMIN_URL`. The
API stamps `targetSurface: "ADMIN"` on staff-only notifications; the bell prefixes those with
`ADMIN_URL` and does a real page navigation (`window.location.assign`), matching how
`AccountMenu`/`MobileNav` already link across. `NotificationType`/`NotificationEntityType`/
`NotificationSurface` in `@outfiqe/types` must stay in sync with the Prisma enums in `apps/api`.

**`/messages` and `/settings/*` use `requireAuthedSession`, not `requireDashboardSession`.**
`requireDashboardSession` sends an admin with no creator/brand dashboard of their own to the admin
console. Direct messages and a person's own account settings are platform-wide — an admin can
receive a DM and must be able to open it — so those routes only require a session. The creator/
brand dashboard routes keep `requireDashboardSession`, which now bounces on _capability_
(`isApprovedCreator || isBrandMember`), so an admin who is also a creator reaches `/earnings`
instead of being bounced by their role.
