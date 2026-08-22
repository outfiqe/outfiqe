# notifications

## Purpose

Wires the shared `NotificationBell` (`@outfiqe/components`) into `apps/web`: the notifications API
client, the socket connection it listens on, and web's own `type -> route` redirect resolver. The
bell, panel, pagination, mute preferences, and cache logic all live in the shared packages — this
feature only owns what's genuinely app-local (see the root `CLAUDE.md`'s Turborepo section).

## Structure

- `SiteNotificationBell.tsx` — mounted in `apps/web/src/components/SiteHeader.tsx`. Renders nothing
  for an unauthenticated visitor. Subscribes to the app's own `shared/lib/socketClient` connection
  via `useSyncExternalStore` (not `useState` + `useEffect` — see rationale below) and passes the
  wrapped socket, `notificationsApi`, and a select handler down to `NotificationBell`.
- `resolveNotificationHref.ts` — the pure `type -> route` resolver for the web surface (creator,
  business, and any authenticated customer — `ORDER_STATUS_CHANGED` reaches all three).

## Funnel

**User-facing:** any signed-in user sees the bell in the site header. Opening it shows their feed;
clicking a row marks it read and navigates to `resolveNotificationHref`'s target for that
notification's type.

**Technical:** `SiteNotificationBell` acquires the shared socket connection on mount (only once
authenticated), passes it to `NotificationBell`, which uses `useNotificationSocket` (`@outfiqe/hooks`)
to keep the react-query cache in sync with live `notification:created`/`updated`/`read`/`read-all`
events. `resolveNotificationHref` is pure — everything it needs is already denormalized onto the
notification by the write path (see `apps/api/src/modules/notifications/README.md`).

## Non-obvious rationale

**The socket is read via `useSyncExternalStore`, not `useState` set inside a `useEffect`.** This
codebase's ESLint config enforces `react-hooks/set-state-in-effect` — calling `setSocket(...)`
synchronously in an effect body is flagged. `useSyncExternalStore` is the React-sanctioned way to
subscribe a component to an external, imperative resource (the socket singleton in
`shared/lib/socketClient.ts`) without that anti-pattern, and its `getServerSnapshot` argument
returns `null` so the socket is never touched during SSR.

**`resolveNotificationHref` sends `LOOK_LIKED`/`LOOK_COMMENTED` to `/dashboard/profile`, not a
per-look page.** `apps/web` has no per-look detail route today — looks only render inline in the
creator profile grid and explore feed. `NEW_FOLLOWER` links to the follower's own profile
(`metadata.recentActors[0].handle`, already denormalized by the write path) when known, falling
back to the dashboard profile otherwise.
