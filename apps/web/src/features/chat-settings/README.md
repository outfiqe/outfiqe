# chat-settings

## Purpose

Settings > Chat (`/dashboard/settings/chat`): lets a signed-in Creator or Business turn chat off
globally, or off with one specific person, and manage the resulting blocked-people list. This is
the entire user-facing surface of Phase 1 of a larger chat system (see
`apps/api/src/modules/chat/README.md` for the full architecture and roadmap) — there's no message
UI yet, since nothing sends messages yet.

## Structure

- `ChatAvailabilitySettings.tsx` — the testable component. Takes `socket: EventSocket | null` as a
  prop (not acquired internally) so it can be rendered in isolation in tests with a fake socket,
  same split `packages/components/src/notifications/NotificationBell.tsx` uses. Composes three
  pieces: the global toggle (`Checkbox`, reusing the same on/off-row pattern
  `NotificationPreferencesView` already established), a debounced contact search
  (`useChatContactSearch` + `useDebouncedValue`) with a "Turn off chat" action per result, and the
  blocked-people list (`useChatBlocks`, `useInfiniteCursorPage`-backed) with a "Turn chat back on"
  action per row.
- `SiteChatAvailabilitySettings.tsx` — the thin app wrapper mounted by the page. Subscribes to the
  shared `shared/lib/socketClient` connection via `useSyncExternalStore` (mirrors
  `SiteNotificationBell.tsx` exactly — see that feature's README for why `useSyncExternalStore`
  specifically) and passes the wrapped socket down.
- `index.ts` — exports both.

The route itself, `apps/web/src/app/dashboard/settings/chat/page.tsx`, is a server component copied
from `settings/security/page.tsx`'s shape (`requireDashboardSession` gate, `max-w-xl` container),
delegating to `SiteChatAvailabilitySettings`. The "Chat" sidebar entry lives in
`apps/web/src/components/DashboardSidebar.tsx` next to "Security", in both the Creator and Business
nav lists — Admin never reaches this page at all, since `requireDashboardSession` redirects an Admin
session to the admin app before the page renders.

## Funnel

**User-facing:** open Settings > Chat. Flip "Turn off chat" to stop sending/receiving any messages
until flipped back. Separately, search a name/handle and click "Turn off chat" next to a result to
mute just that person (mutual — neither side can message the other), or click "Turn chat back on"
next to anyone already in the blocked list to undo it.

**Technical:** `useChatSettings`/`useChatBlocks`/`useChatContactSearch` (`@outfiqe/hooks`) call
`chatApi` (`shared/lib/chatApi.ts`, wired to the shared `apiClient` singleton) → `GET`/`PATCH
/chat/settings`, `GET /chat/blocks`, `GET /chat/blocks/search`, `POST`/`DELETE /chat/blocks/:userId`
(see `apps/api/src/modules/chat/README.md`). Every mutation optimistically updates its React Query
cache entry before the request resolves (same pattern `useNotifications` uses for mark-read).
`useChatSettingsSocket` listens for the `chat:settings:updated`/`chat:block-list:updated` socket
events the backend re-broadcasts to the caller's own room, so a toggle made in one browser tab or
device is reflected in any other open one without a manual refresh.

## Non-obvious rationale

**No `Switch` component was added.** A boolean settings toggle already has an established pattern in
this codebase — `NotificationPreferencesView` uses the plain `Checkbox` primitive for exactly this
shape (a labeled on/off row). Introducing a new pill-style `Switch` into `packages/design-system` for
one more on/off row would be inconsistent with that existing pattern for no real gain, so the global
toggle reuses `Checkbox` as-is.

**The per-person picker is a live search-and-act list, not an autocomplete dropdown.** The closest
existing analog for "search someone, then act on them inline" is `FollowersModal`/`FollowingModal`
(`apps/web/src/components/`) — a debounced `Input` with results rendered as a scrollable list of
rows, each with its own action button — not the `Autocomplete` dropdown primitive `ProductSearchBox`/
`ExploreSearchBox` use for select-one-and-navigate. This page needs to show and act on possibly
several results at once (block more than one person in a sitting), which fits the list-of-rows shape
better than a single-select dropdown.
