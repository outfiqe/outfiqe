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
  components as the panel rather than duplicating them. Both routes wrap it in the same chrome as
  the rest of the signed-in account area — `SiteHeader` plus `DashboardMobileNavBar`, no
  `SiteFooter` — since `/messages` is reached from the dashboard, not the storefront. Its outer
  height is `100dvh` minus a plain, hardcoded `rem` reserve for the sticky header and, below `lg`,
  the bottom nav's footprint (the hub button sits ~6.5rem above the viewport edge); the `lg` reserve
  is smaller because the bottom nav is hidden there. Deliberately a plain constant, not
  `var(--site-header-height)` (the CSS var `HeaderBar` publishes, used elsewhere by `MobileNav.tsx`)
  — combining that `var(--x,fallback)` syntax with a responsive prefix (`sm:h-[calc(...)]`) broke
  Tailwind's class generation for the whole string, silently dropping every other class on the
  element (`sm:my-6`, `sm:rounded-2xl`, `sm:border`, `lg:h-[...]` all failed to apply). The bare var
  works fine unprefixed (`MobileNav.tsx`'s usage); avoid pairing it with a breakpoint variant.
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

**Every `CONVERSATIONS_QUERY_KEY` invalidation in `@outfiqe/hooks` goes through
`invalidateConversationsList` (`useConversations.ts`), never a raw `invalidateQueries({ queryKey:
CONVERSATIONS_QUERY_KEY })`.** React Query's default `invalidateQueries` match is a key-prefix
match, and `CONVERSATIONS_QUERY_KEY` is `["conversations"]` — a prefix of both
`conversationQueryKey(id)` (`useConversation`) and `conversationMessagesQueryKey(id)`
(`useConversationThread`) too. A bare prefix invalidation on every send/mark-read/presence-change/
socket event would also invalidate and refetch every currently-open thread, wasting a request and
able to overwrite an optimistic message-send with a stale response mid-flight.
`invalidateConversationsList` uses a `predicate` instead, matching only the bare list key
(`["conversations"]`) and its search variants (`["conversations", { q }]`, from
`useConversations`' optional search term) — never a query whose second key segment is a
conversation id string. Search itself is server-side (`GET /conversations?q=`, filtered in the
Prisma query alongside the existing participant/`lastMessageAt` `where` clauses, debounced 300ms
client-side via `useDebouncedValue`, same shape as `useChatContactSearch`) rather than filtering
the already-loaded page client-side, since a user's full conversation history isn't guaranteed to
already be loaded.

**The `message:created`/`MESSAGE_CREATED` socket payload carries full attachment data
(`id`/`url`/`mimeType`/`width`/`height`), not a `hasAttachments` boolean.** The sender's own bubble
comes from the REST response, which always has the real attachments, so this only mattered for the
_recipient's_ live view — `useConversationSocket`'s `toBroadcastMessage` used to hardcode
`attachments: []`, which meant a live-received photo message rendered with no image at all until
the thread was refetched (reopening it, or a full refresh). Keep the payload's attachment shape
matching `MessageAttachment` (`packages/types`) if that type ever changes.

**`ChatPanelProvider` closes the panel whenever the pathname changes.** `isOpen` is plain
`useState`, global for the whole app, with no lifecycle tied to routing — so without this, opening
the panel and then navigating away by any means other than the panel's own close button or its
"expand" action (a browser back/forward, a sidebar link, anything) left it mounted, on top of
whatever page you landed on, with no way to dismiss it short of a reload. A `usePathname()` +
previous-pathname ref closes it on any pathname change instead of trying to enumerate every
navigation trigger.

**No `Switch`/multi-window chat, but a new `Drawer` primitive was added to `packages/design-system`.**
Neither `Modal` (blocking, unmounts with its page) nor `Popover` (anchored, sized for small
transient content) fit a non-blocking panel that has to survive route changes — see that
component's own file for the reasoning. Below `sm`, `Drawer` is a swipeable bottom sheet (`90dvh`,
rounded top corners, a backdrop, drag-down-to-dismiss via `useSwipeToDismiss` from
`@outfiqe/design-system`); at `sm` and up it stays the original small floating panel anchored to the
bottom-right corner, where a full-height sheet and backdrop wouldn't make sense. Its `z-[60]` sits
above `DashboardMobileNavBar` (`z-50`), and `DashboardMobileNavBar` also just hides itself entirely
while `useChatPanel().isOpen` is true — with the panel already swipeable and dismissible, letting
the persistent bottom nav's hub button show through underneath it was confusing, not useful. Message
bubbles, the typing/date-separator chips, and the composer are deliberately kept as local,
chat-specific markup rather than forced into generic design-system primitives, per the explicit call
on this build to keep bespoke chat UI local.
