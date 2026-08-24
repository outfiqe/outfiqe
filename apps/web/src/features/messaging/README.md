# messaging

## Purpose

Real-time 1:1 messaging: a floating chat panel reachable from anywhere in the app, a full
`/messages` page to "pop out" into, and the "Message" entry points on Creator/Business profiles
that launch a conversation. Everything here is gated by Phase 1's `chatService
.isChatAvailableBetween` server-side — this feature only renders what the API already allows.

## Structure

- `ChatPanelContext.tsx` — the one place that owns cross-page chat state (`ChatPanelProvider`,
  `useChatPanel()`): which conversation is open, whether the panel is open, and the single shared
  socket connection this whole feature runs on (`useConversationSocket`, `usePresenceSocket`,
  `useConversationRoomSubscription` are all wired here, not per-component). Mounted once in
  `apps/web/src/app/providers.tsx`, alongside `AuthProvider` — the only place in this app that's
  genuinely global across every route.
- `FloatingChatLauncher.tsx` — the persistent bottom-right bubble (authenticated users only),
  showing a total-unread badge, hidden while the panel itself is open.
- `ChatPanel.tsx` — the `Drawer`-wrapped (`@outfiqe/design-system`) panel: swaps between
  `ConversationList` and `MessageThread` depending on `useChatPanel().view`, with an "expand to
  full page" action that navigates to `/messages` (or `/messages/:conversationId`) and closes the
  panel.
- `MessagesPageLayout.tsx` — the full-page, two-pane equivalent (`apps/web/src/app/messages/page.tsx`
  and `.../[conversationId]/page.tsx`), reusing the exact same `ConversationList`/`MessageThread`
  components as the panel rather than duplicating them.
- `ConversationList.tsx` — takes `onSelect`/`activeConversationId` as props rather than reading
  `useChatPanel()` itself, so both the panel and the full page can drive it differently (panel
  switches its internal view; the full page navigates).
- `MessageThread.tsx` — header (avatar, presence/last-seen), the scrollable message list (oldest
  at top; upward infinite scroll via `useLoadMoreOnVisible` for older history, scroll-position
  preserved across a prepend), and per-message sent/delivered/read ticks. Marks the conversation
  read whenever the newest message id changes while this thread is mounted.
- `MessageComposer.tsx` — text + up to 6 photo attachments (uploaded through the existing
  `uploadsApi` before send, then referenced by URL) + `EmojiPicker.tsx` (a small curated grid built
  on the design system's `Popover` — not a new dependency).
- `messagingTime.ts` — `date-fns`-based formatting (`formatMessageClock`,
  `formatMessageDateSeparator`, `formatLastSeen`), reusing the app's existing
  `shared/lib/formatRelativeTime.ts` for the "Active 3h ago" text rather than re-deriving it.

## Funnel

**User-facing:** click "Message" on a Creator or Business profile (hidden on your own profile;
hidden on a Business profile with no resolvable contact) — the floating panel opens straight into
that conversation, creating it on first message if it didn't already exist. From anywhere else,
the floating bubble (with an unread badge) opens the conversation list; picking a conversation
opens its thread. The panel's expand icon (or navigating to `/messages` directly) gives the same
experience as a dedicated two-pane page. Typing shows an emoji picker and a photo-attach button;
sent messages show a clock time and, for your own messages, a tick (sent → delivered → read,
colored once read) under each bubble. The other participant's presence ("Active now" / "Active
3h ago") shows in the thread header and updates live without a refresh.

**Technical:** `ChatPanelProvider` acquires the shared `shared/lib/socketClient` connection once
(reference-counted, same singleton `SiteNotificationBell`/`SiteChatAvailabilitySettings` already
share) and keeps three socket-bridge hooks (`@outfiqe/hooks`) live for the whole app:
`useConversationSocket` patches the React Query cache on `message:created`/`conversation:updated`,
`usePresenceSocket` patches the open conversation's `otherParticipant.isOnline`/`lastSeenAt` on
`presence:changed`, and `useConversationRoomSubscription` joins/leaves the active conversation's
socket room as the user opens/closes a thread. Sending goes through REST
(`POST /conversations/:id/messages`, `packages/client/src/conversations`) with an optimistic cache
prepend (`useSendMessage`); the server's real-time broadcast (see
`apps/api/src/modules/chat/README.md`) is what actually delivers it live to the other participant
and to any other open tab/device of the sender's own.

## Non-obvious rationale

**`ConversationList` doesn't call `useChatPanel()` itself.** It's used in two structurally
different containers — a drawer that manages an internal `{ kind: "list" | "thread" }` view, and a
full page that navigates via the router — so it takes `onSelect`/`activeConversationId` as plain
props instead. This is the same reasoning `NotificationPanel`'s reuse across
`packages/components`/app wrappers already established: keep the presentational list dumb, let
each container own its own navigation model.

**Business profile's "Message" button targets the brand's `BrandMembership{role: OWNER}` user,
resolved server-side (`contactUserId` on `PublicBrandProfile`), not the `Brand` itself.** Chat
participants are always `User`s (established in Phase 1 — see `apps/api/src/modules/chat/README.md`),
and a `Brand` can have multiple staff; routing "Message" to the owner mirrors how "Contact seller"
flows work elsewhere and avoids inventing brand-as-participant semantics this system doesn't have.
The button is hidden entirely when `contactUserId` is null (no owner membership yet) or when the
viewer's own `state.user.brandId` matches the brand being viewed.

**Every `CONVERSATIONS_QUERY_KEY` invalidation in `@outfiqe/hooks` passes `exact: true`.** React
Query's default `invalidateQueries` match is a key-prefix match, and `CONVERSATIONS_QUERY_KEY` is
`["conversations"]` — a prefix of both `conversationQueryKey(id)` (`useConversation`) and
`conversationMessagesQueryKey(id)` (`useConversationThread`). Without `exact: true`, invalidating
the conversation list on every send/mark-read/presence-change/socket event also invalidates and
refetches every currently-open thread, which both wastes a request and can overwrite an
optimistic message-send with a stale response mid-flight. `exact: true` scopes the invalidation to
the list query only, which is the only one these call sites actually mean to refresh.

**No `Switch`/multi-window chat, but a new `Drawer` primitive was added to `packages/design-system`.**
Neither `Modal` (blocking, unmounts with its page) nor `Popover` (anchored, sized for small
transient content) fit a non-blocking panel that has to survive route changes — see that
component's own file for the reasoning. Message bubbles, the typing/date-separator chips, and the
composer are deliberately kept as local, chat-specific markup rather than forced into generic
design-system primitives, per the explicit call on this build to keep bespoke chat UI local.
