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
  cursor-shaped list endpoint can build on.
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
