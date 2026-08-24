# chat

## Purpose

Real-time chat: availability controls (global "turn off chat" + per-person mutual block, Phase 1),
1:1 direct messaging with image attachments, real-time delivery, presence/last-seen, and
sent/delivered/read receipts (Phase 2). `chatService.isChatAvailableBetween` (Phase 1) gates every
message send, so nothing here has to re-derive the block/settings rule. Group chats and the
Admin/Support conversation type are not built yet — see Follow-ups.

## Structure

**Availability (Phase 1)**

- `chat.routes.ts`, `chat.controller.ts` — settings/block route table and thin request/response
  glue.
- `chat.service.ts` — `getSettings`/`setGlobalChatEnabled`, `blockUser`/`unblockUser`,
  `listBlockedUsers`, `searchContacts`, and `isChatAvailableBetween` — the enforcement rule the
  messaging path below calls before every send.
- `chat.repository.ts` — `ChatSettings` read/upsert, `ChatBlock` create/delete/lookup (a single row
  represents a mutual block, looked up with an `OR` on both directions), `searchContacts`.
- `chat.schemas.ts`, `chat.types.ts`, `chat.constants.ts`, `chat.utils.ts` — settings/block
  validation, DTOs, tuning constants, `toBlockedChatContact`.
- `chat.socket.ts` — consumes `CHAT_SETTINGS_UPDATED`/`CHAT_BLOCK_LIST_UPDATED`, re-emits to the
  acting user's own `userRoom` for cross-tab/device sync.

**Messaging (Phase 2)**

- `conversation.routes.ts`, `conversation.controller.ts`, `message.controller.ts` — `POST`/`GET
/conversations`, `GET /conversations/:id`, `GET`/`POST /conversations/:id/messages`, `PATCH
/conversations/:id/read`. All `requireAuth`; message-send carries `rateLimit()` from day one
  (`MESSAGE_SEND_RATE_LIMIT_*` in `chat.constants.ts`).
- `conversation.service.ts` — `startDirectConversation` (self/target/availability checks, then
  atomic find-or-create), `getConversation`, `listConversations` (cursor-paginated, batches
  presence lookups for the page rather than one Redis check per row), plus the shared
  `requireParticipant` guard `message.service.ts` also uses.
- `conversation.repository.ts` — `Conversation`/`ConversationParticipant` access. `findOrCreateDirect`
  is an atomic upsert on `Conversation.directKey` (sorted `"userA:userB"`, unique) — a race between
  two concurrent starts is resolved by catching the unique-constraint violation and re-reading,
  not a check-then-create race.
- `message.service.ts` — `sendMessage` (participant + per-send availability re-check — a
  conversation can already exist from before either side blocked the other — then persist, publish
  `MESSAGE_CREATED`, mark delivered for any recipient who's online right now), `listMessages`
  (marks delivered-up-to-latest for the caller as a side effect of fetching page one — fetching the
  thread _is_ delivery), `markRead`.
- `message.repository.ts` — `Message`/`MessageAttachment` access; `send` is one transaction
  (insert message + attachments, bump `Conversation.lastMessageAt`/`lastMessagePreview`, increment
  every other participant's `unreadCount`).
- `conversation.types.ts`, `message.types.ts`, `conversation.schemas.ts`, `message.schemas.ts`,
  `conversation.utils.ts`, `message.utils.ts` — DTOs, Zod validation (`sendMessageBodySchema`
  requires `body` or at least one attachment), and the row→DTO mappers, including the
  `isDeliveredToOthers`/`isReadByOthers` computation (cursor-timestamp comparison, not a
  per-message read-receipt row).
- `conversation.socket.ts` — three concerns: `registerConversationSocketHandlers` (join/leave a
  `conversationRoom`, checking real participant membership before joining — this room carries
  private message content, unlike the public `commentsRoom`), `registerMessageEventConsumer`
  (broadcasts `MESSAGE_CREATED` to the conversation room + each recipient's `userRoom`, and creates
  an offline-fallback `Notification` — `NotificationType.NEW_MESSAGE` — only for a recipient with no
  active socket connection right now), `registerPresenceSocketConsumer` (fans a `PRESENCE_CHANGED`
  event out to every conversation the affected user is part of).

**Presence (Phase 2, pulled forward from the original roadmap)**

- `apps/api/src/shared/socket/socket.presence.ts` — `isUserOnline(userId)`, a live
  `fetchSockets()` check against that user's `userRoom` (the Redis adapter already tracks this
  accurately across nodes — no separate TTL/heartbeat store needed for "online right now"). Fails
  open (`false`) if Socket.IO isn't reachable, same as every other best-effort Redis/socket read in
  this codebase.
- `apps/api/src/shared/socket/socket.server.ts` — the connect/disconnect handlers publish
  `DomainEvents.PRESENCE_CHANGED` exactly when a user's connection count crosses 0→1 or 1→0 (not on
  every socket event), and persist `User.lastSeenAt` on the last-connection-closes transition —
  that's the one piece presence genuinely needs storage for, since a live `fetchSockets()` check
  can't answer "when were they last online" once they're gone.

## Funnel

**User-facing:** a Creator or Business opens Settings > Chat for availability controls (Phase 1 —
unchanged). To actually message someone, they click "Message" on a profile
(`apps/web/src/features/messaging/README.md`) or pick a conversation from the floating panel/
`/messages` page. Sending, receiving, delivery/read ticks, and presence are all live — see the
frontend README for the full UI-side funnel.

**Technical:** `conversation.routes`/`message.controller` → `conversation.service`/`message.service`
→ their repositories → Postgres. Every send publishes `MESSAGE_CREATED` (Redis Streams,
`shared/events`) after the DB transaction commits; `conversation.socket.ts` is the only consumer,
decoupling "was this delivered live" from "was this persisted" the same way `notifications`
decouples notification-row-creation from its own socket broadcast. Presence follows the identical
persist-then-publish-then-broadcast shape, just triggered by connection lifecycle instead of a
domain write.

## Non-obvious rationale

**A single `ChatBlock` row represents a mutual block, not two** (Phase 1) — see `findBlockBetween`'s
`OR` lookup; unchanged by Phase 2, `isChatAvailableBetween` is called as-is from `sendMessage`.

**Why `Conversation`/`Message` didn't exist until Phase 2, and why they're shaped the way they are
now that they do.** Phase 1 deliberately shipped nothing here — see the git history on this file.
Now that messaging is real: `directKey` (a sorted, unique composite of both participants' ids) is
what makes "find or start a DM with this person" idempotent without a separate lookup table or an
application-level lock — the DB's own unique constraint is the race-safety mechanism, caught and
retried on conflict rather than prevented with a `SELECT ... FOR UPDATE`. `ConversationParticipant`
carries three independent cursors (`lastReadAt`/`lastReadMessageId`,
`lastDeliveredAt`/`lastDeliveredMessageId`, and a denormalized `unreadCount`) rather than a
per-message receipts table — the same "efficient unread count via a cursor, not a COUNT() or a row
per recipient per message" design this module's Phase 1 research already locked in, now applied to
delivery too.

**Delivery marking has two paths, not one.** A message is marked delivered to a recipient
immediately at send time only if `isUserOnline` says they have a live connection right now
(`sendMessage`); otherwise it's marked delivered the moment they next fetch the thread
(`listMessages`, only on the first/cursor-less page — fetching an older history page must not
retroactively mark the newest message "delivered" against a page that doesn't contain it). This
mirrors how real chat systems distinguish "pushed live" from "picked up on reconnect" without
needing a client-side delivery-ack round trip, which would be real additional protocol surface for
marginal gain at this product's scale.

**Presence reuses the Socket.IO Redis adapter's own room membership instead of a second TTL store.**
The original Phase 1 research plan sketched a Redis-key-per-connection + heartbeat design for
presence — that's the standard answer when you _don't_ already have an adapter tracking connections
accurately across nodes. Since `@socket.io/redis-adapter` already does exactly that,
`fetchSockets()` against `userRoom(userId)` is a correct, live, zero-extra-infrastructure answer to
"is this user online right now." The only genuinely new storage this needed was `User.lastSeenAt`,
because "online right now" and "when were they last online" are different questions and only the
second one requires persistence past disconnect.

**`PRESENCE_CHANGED` fans out to every conversation the user is part of, not to a followers/contacts
list.** There's no general-purpose "who has this user in their contact list" query in this system —
conversations are the only durable relationship chat cares about — so
`conversationRepository.listConversationIdsForUser` (capped, matching the `FOLLOWING_SCAN_CAP`-style
defensive bound already used elsewhere in this codebase) is the natural fan-out set: broadcasting to
every conversation room reaches exactly the people who currently have an open thread with this
user, which is also exactly who needs to see their presence change live.

## Follow-ups

Roadmap, in build order — each phase reuses this module's `isChatAvailableBetween` and event/socket
plumbing rather than introducing a parallel mechanism:

1. Turn Off Chat — done.
2. 1:1 direct messaging, real-time delivery, presence/last-seen, sent/delivered/read receipts,
   image attachments — done.
3. Typing indicators (new Redis Pub/Sub channel — ephemeral/high-frequency, deliberately not routed
   through Redis Streams the way `MESSAGE_CREATED`/`PRESENCE_CHANGED` are).
4. Group chats (`ConversationType.GROUP`) — add/leave participants; a block only blocks new DIRECT
   conversations and sends, not an existing group membership (documented as an intentional v1
   simplification when that phase lands).
5. Admin/Support `ConversationType.SUPPORT` — queue-style, any Admin can view/reply, sender Admin id
   recorded per-message for audit, exempt from `ChatSettings`/`ChatBlock` (already true today via
   `isChatAvailableBetween`'s Admin short-circuit). First real chat UI in `apps/admin`.
6. Remaining hardening not already covered by Phase 2's day-one rate limiting: socket message-size
   caps, reconnection message replay, an origin-allowlist review for the socket handshake (OWASP
   WebSocket Security Cheat Sheet).
