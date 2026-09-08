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
  wrapped socket, `notificationsApi`, and a select handler down to `NotificationBell`. The select
  handler resolves the href, then routes it with `window.location.assign` when
  `isFullPageNavHref` says it points at the admin app (a cross-origin URL, or the `ADMIN_URL`
  path prefix) and `router.push` otherwise.
- `resolveNotificationHref.ts` — the `type -> route` resolver for the web surface (creator,
  business, and any authenticated customer — `ORDER_STATUS_CHANGED` reaches all three). Takes the
  signed-in user's own `handle` (from `auth`'s session — see rationale below) since
  `LOOK_LIKED`/`LOOK_COMMENTED` need it to link into that user's own profile, and an `isAdmin`
  flag as its third argument. Staff-only types (`BRAND_APPLICATION_SUBMITTED`,
  `SUPPORT_TICKET_CREATED`/`_ASSIGNED`, `CRM_ITEM_ASSIGNED`, `COUPON_*`) resolve to an absolute
  `${ADMIN_URL}/…` deep link — they have no page on this app and the dashboard/support guards
  would bounce an admin to the admin root and drop the path. `SUPPORT_TICKET_REPLY`/`_RESOLVED`
  reach both a customer and staff, so they branch on `isAdmin`: the admin ticket view vs. the
  customer `/support?ticket=` thread.
- `notificationRoutes.ts` — the route path literals and small path builders used by the resolver,
  kept out of the switch so a mistyped path is a change in one named place rather than a bare
  string buried in a `case`.

## Funnel

**User-facing:** any signed-in user sees the bell in the site header. Opening it shows their feed;
clicking a row marks it read and navigates to `resolveNotificationHref`'s target for that
notification's type.

**Technical:** `SiteNotificationBell` acquires the shared socket connection on mount (only once
authenticated), passes it to `NotificationBell`, which uses `useNotificationSocket` (`@outfiqe/hooks`)
to keep the react-query cache in sync with live `notification:created`/`updated`/`read`/`read-all`
events. `resolveNotificationHref` is pure — everything it needs is already denormalized onto the
notification by the write path (see `apps/api/src/modules/notifications/README.md`), plus the
`handle`/`isAdmin` the bell reads from `useAuth`.

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
staff-only notification types have no page here, and `requireDashboardSession` /
`app/support/page.tsx` redirect an admin to the admin root (dropping any `?ticket=`/path) if they
land on a dashboard or support route. So the resolver returns an absolute `${ADMIN_URL}/…` link
for those types and `SiteNotificationBell` does a real page navigation (`window.location.assign`)
instead of `router.push`, matching how `AccountMenu`/`MobileNav` already link across to the admin
app. `NotificationType`/`NotificationEntityType` in `@outfiqe/types` must stay in sync with the
Prisma enum in `apps/api` (the `COUPON_*` types were missing, which made those notifications fall
through to `default: null` and show the generic panel message).
