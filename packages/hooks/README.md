# @outfiqe/hooks

## Purpose

Shared React hooks reused across `apps/web` and `apps/admin` — generic data-fetching helpers
(debounce, infinite cursor pagination) and the notification feed's fetch/mutate/socket-sync logic.

## Structure

- `useDebouncedValue.ts` — generic debounced-value hook (search inputs, autocomplete).
- `useDragReorder.ts` — `arrayMove` plus `useDragReorder`: native HTML5 drag-and-drop reordering
  for any ordered list. Returns `getDragProps(id)` to spread on each row (drag source + drop
  target), `moveEntry(fromIndex, toIndex)` for the up/down arrow buttons that stay as the keyboard
  fallback, and `draggingId`/`dragOverId` for styling. Used by the web taste picker
  (`CustomizeTasteModal`) and the admin `CategoriesPage` / `StageConfigModal` lists.
- `useInfiniteCursorPage.ts` — generic cursor-paginated `useInfiniteQuery` wrapper any
  cursor-shaped list endpoint can build on. A `select` strips any `null`/`undefined` page out of
  `data.pages` before consumers see it — a page can be null when an API client resolves a 5xx to
  `null` instead of throwing (see the `getNextPageParam` `?.`), or when a failed server-side
  prefetch (a `*Server` fn that `catch`es to `null`) still gets dehydrated into the client cache.
  Without the filter, every `data.pages.flatMap((page) => page.something)` call site — and there
  are ~20 — crashes on `Cannot read properties of null`. The `select` is `useCallback`-wrapped so
  its identity is stable and react-query doesn't re-run it (and re-break `useMemo([data])` in
  consumers like `BrandProfile`) each render. The optional 4th argument,
  `revalidateStalePersistedCacheOnMount`, forces `refetchOnMount: "always"` and
  `refetchOnReconnect: "always"` — see the "Non-obvious rationale" bullet on `apps/web`'s
  persisted-query allowlist for why any query key under `explore-feed`/`creator-looks` needs this.
- `useNotifications.ts` — `NOTIFICATIONS_QUERY_KEY`/`NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY`, and
  `useNotifications`: the feed's cursor pagination (via `useInfiniteCursorPage`) plus optimistic
  mark-read/mark-all-read. Owns fetching and mutating only — real-time updates come from
  `useNotificationSocket`, which writes into these same query cache keys.
- `useNotificationPreferences.ts` — the per-type mute list: fetch + optimistic toggle mutation.
- `useNotificationSocket.ts` — `NotificationSocket` (the narrow `on`/`off`-only interface the bell
  depends on instead of the full `socket.io-client` `Socket`), `toNotificationSocket` (the
  `Socket` -> `NotificationSocket` adapter), and `useNotificationSocket` itself: wires a
  connected socket's `notification:created`/`updated`/`read`/`read-all` events into the same
  react-query cache `useNotifications` reads. `NOTIFICATION_SOCKET_EVENTS`' string literals must
  stay in sync with `SOCKET_EVENTS` in the API's `apps/api/src/shared/socket/socket.keys.ts` — they
  aren't shared across the two packages since the API doesn't depend on `@outfiqe/hooks`.
- `index.ts` — re-exports everything above; both apps only ever import from `@outfiqe/hooks`.

## Non-obvious rationale

**`useDragReorder` keeps the up/down arrow buttons rather than replacing them.** Native HTML5
drag has no keyboard or screen-reader story and is unreliable on touch, so `moveEntry` drives the
same reorder from arrow buttons that stay in every consumer — matching the `KanbanBoard`
precedent in `@outfiqe/components`, which always pairs its native drag with a non-drag control.
No drag-and-drop library was added.

**`NotificationSocket` is a narrow `on`/`off`-only interface, not the real `socket.io-client`
`Socket` type.** The bell only ever registers/unregisters listeners — it never emits to the server
and never inspects connection state — so depending on this slice keeps a test double simple (it
can implement the interface directly). A real `Socket` can't structurally satisfy a plain
non-generic method signature the way this interface declares `on`/`off` (its own `on`/`off` are
generic over a typed event map this app never configures, `DefaultEventsMap`), so `toNotificationSocket`
adapts one, rather than the consuming components taking a real `Socket` and casting it.

**`toNotificationSocket` memoizes its adapter per underlying `Socket` in a `WeakMap`.**
`useSyncExternalStore`'s `getSnapshot` (used by `SiteNotificationBell`/`AdminNotificationBell` to
subscribe to the socket singleton) must return a referentially stable value across calls when
nothing changed; since `getSocket()` already returns the same singleton on every call, the adapter
has to be memoized the same way or every render would hand `NotificationBell` a "new" socket.

**`useNotificationSocket`'s `handleUpdated` removes the existing card and re-inserts it at the
front of the first page**, rather than patching it in place. A grouped notification (e.g. "Jane and
3 others liked your post") that gets a new actor should resurface to the top of the feed the way a
brand-new notification would, not stay wherever it was originally inserted.

**`connect` reconciles the unread count via a REST invalidation, not an optimistic patch.** A
live-only counter would drift if any event was missed while the socket was disconnected (a mark-read
on another tab, a reconnect after a server restart); refetching on every `connect` — including the
first one — makes a missed event self-heal within one reconnect instead of silently staying wrong.

**A persisted-and-rehydrated query can look "fresh" while carrying stale per-viewer state.**
`apps/web`'s `Providers.tsx` persists react-query's whole cache to IndexedDB for a set of query
roots (`PERSISTABLE_QUERY_ROOTS` in `apps/web/src/features/pwa/constants/offlineCache.ts`) so
previously-seen content still renders instantly offline. Restoring a persisted query keeps its
original `dataUpdatedAt`, and react-query's default `staleTime` (30s app-wide) is measured from
that timestamp, not from the moment of rehydration — so a page refresh moments after liking/saving/
following something can restore a snapshot still inside its staleTime window and skip revalidating
entirely, showing the pre-action state for up to 30 seconds. This was a real, live bug: the explore
feed's "For You"/"Following" tabs (`["explore-feed", tab]`, a persisted root) showed the wrong
like/save/follow state after a refresh or tab switch, while the creator profile grid
(`["creator-looks", handle]`, also persisted) happened not to hit it in practice. Any query key
under a persisted root that also carries interactive, frequently-mutated per-viewer state needs
`revalidateStalePersistedCacheOnMount: true` for exactly this reason — trust the persisted snapshot
for the instant first paint, never trust it to skip revalidating once the viewer is back online.
The flag forces `refetchOnReconnect: "always"` too, not only `refetchOnMount` — they're independent
react-query options, and a query that's already mounted and sitting on screen through a real
offline/online cycle needs the same guarantee a fresh mount gets, or coming back online silently
does nothing for a query react-query still considers fresh by its frozen `dataUpdatedAt`.
