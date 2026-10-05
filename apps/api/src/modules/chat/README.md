# chat

## Purpose

Real-time chat: availability controls (global "turn off chat" + per-person mutual block, Phase 1),
1:1 direct messaging with image attachments, real-time delivery, presence/last-seen, and
sent/delivered/read receipts (Phase 2), and group chats with admins, member management and event
lines ("Sita added Ram"). `chatService.resolveChatAvailability` (Phase 1) gates every direct message
send, every conversation start and every person added to a group, so nothing here has to re-derive
the block/settings rule. The Admin/Support conversation type is not built yet — see Follow-ups.

## Structure

**Availability (Phase 1)**

- `chat.routes.ts`, `chat.controller.ts` — settings/block route table and thin request/response
  glue.
- `chat.service.ts` — `getSettings`/`setGlobalChatEnabled`, `blockUser`/`unblockUser`,
  `listBlockedUsers`, `searchContacts`, and the enforcement rule the messaging path below calls
  before every send: `resolveChatAvailability` returns `{ isAvailable: true }` or `{ isAvailable:
false, reason }` — one of `YOU_TURNED_OFF_THIS_PERSON` (the caller owns the block),
  `YOUR_CHAT_DISABLED` (the caller's own global toggle), or `RECIPIENT_UNREACHABLE` (the other
  side's block or global toggle — deliberately not distinguished, so the caller can't tell whether
  the other person blocked them specifically or just has chat off). `isChatAvailableBetween` is the
  boolean projection of that, kept for callers that only need yes/no.
- `chat.repository.ts` — `ChatSettings` read/upsert, `ChatBlock` create/delete/lookup (a single row
  represents a mutual block, looked up with an `OR` on both directions), `searchContacts`.
- `chat.schemas.ts`, `chat.types.ts`, `chat.constants.ts`, `chat.utils.ts` — settings/block
  validation, DTOs (incl. `ChatUnavailableReason`/`ChatAvailability`), tuning constants,
  `toBlockedChatContact`, and `chatUnavailableError` (maps a `ChatUnavailableReason` to the
  `CHAT_UNAVAILABLE` `AppError` with the reason-specific user-facing message).
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

**Group chats**

- `conversation.routes.ts` — the group routes sit next to the direct ones: `POST
/conversations/groups` (idempotency key, create rate limit), `PATCH /conversations/:id` (rename),
  `GET`/`POST /conversations/:id/members`, `PATCH`/`DELETE /conversations/:id/members/:userId`,
  `POST /conversations/:id/leave`. Every change except leaving carries the group-manage rate limit.
- `group.controller.ts`, `group.schemas.ts`, `group.types.ts`, `group.utils.ts` — request glue,
  validation (names up to 60 characters, at most 50 people per request, unknown fields refused)
  and the member view shape.
- `group.service.ts` — every rule: who can be added, the member limit, admin-only actions, the
  last-admin rules, and writing an event line for each change. Every change runs in one
  transaction that locks the conversation row first.
- `group.repository.ts` — conversation-row lock (`SELECT ... FOR UPDATE`), group creation, member
  reads and writes, admin counts.
- `message.repository.ts`'s `createSystemMessage` and `message.utils.ts`'s `describeSystemEvent`/
  `parseSystemEvent` — event lines are ordinary `Message` rows with `kind: SYSTEM` and a
  `systemEvent` JSON payload, checked against `chatSystemEventSchema` (`message.schemas.ts`)
  every time one is read back.
- `conversation.socket.ts`'s `registerConversationMembershipConsumer` — on
  `CONVERSATION_MEMBER_REMOVED`, pulls every open socket of the removed person out of the
  conversation room and tells their devices to drop the chat (`conversation:removed`).

**Build chats (Outfit Build)**

- `build-chat.service.ts` — `buildChatService`, used only by `../outfits` inside a build's
  transaction: create the build's group chat when its first editor joins, add editors, remove a
  removed or leaving editor, rename it with the build. Each change writes its event line and an
  outbox row instead of publishing straight away.
- `chat.outbox.ts` — the outbox handlers for `chat.message-created` and `chat.member-removed`.
  They reload the event line (`messageRepository.findById`) and republish the ordinary
  `MESSAGE_CREATED` / `CONVERSATION_MEMBER_REMOVED` domain events, so delivery, ticks and offline
  notifications work exactly as for any group.
- `group.service.ts` refuses every group-management action (rename, add, remove, change admin,
  leave) on a build's chat with `409 BUILD_CHAT_MANAGED_BY_BUILD`; reading its members still works.
- `chat.service.ts`'s `hasBlockBetween` — the block check builds use for invites and shares.

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

**Tenant staff are unreachable in chat, except by platform staff.** `computeChatAvailability` returns `RECIPIENT_UNREACHABLE` whenever either side is `UserRole.TENANT_STAFF`, after the platform-staff bypass has already returned true. A tenant's employees therefore can't message customers or creators, and can't be found in the contact search (`searchContacts` excludes both staff types), while Outfiqe support can still reach a tenant's staff to help them. Chat between tenant staff and customers is a deliberate later product decision, not a side effect of an account type.

**A single `ChatBlock` row represents a mutual block, not two** (Phase 1) — see `findBlockBetween`'s
`OR` lookup; unchanged by Phase 2, the availability check is called as-is from `sendMessage`.

**The send/start error names three cases but only distinguishes the two the caller can act on.**
`resolveChatAvailability` returns `YOU_TURNED_OFF_THIS_PERSON` and `YOUR_CHAT_DISABLED` because the
caller can fix both (unblock the person, or flip their own global toggle), so the message points
them at the fix. Every other case — the recipient blocked the caller, or the recipient has chat off
globally — collapses to `RECIPIENT_UNREACHABLE` with one generic message: telling a caller "this
person blocked you specifically" versus "this person has chat off" leaks the other user's private
moderation choice for no actionable benefit. The block-direction check keys on `block.blockerId ===
callerId`, which is why `ChatBlock` keeping `blockerId`/`blockedId` (rather than a symmetric pair)
matters even though the block itself is mutual.

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

**Group chats follow chat's own delivery path, not the outbox.** Messages here are announced
through Redis Streams (`eventBus`) after the transaction commits, and group event lines use the
same path so one module doesn't mix two delivery mechanisms. The transactional outbox
(`src/shared/outbox/README.md`) is for Outfit Build writes; moving all of chat onto it would be its
own change.

**Who can be added to a group is the same question as "could I message them directly?"** Adding
someone runs `resolveChatAvailability(adder, person)` for each person. A block in either direction,
chat turned off, a suspended account or a tenant-staff account all refuse the add. The refusal
lists the ids that couldn't be added (`MEMBERS_UNREACHABLE`), the same level of detail a failed
direct start already gives, without saying which reason applied. Once someone is in a group, a
block between two members doesn't stop either of them sending there. That's the "a block only
blocks new direct conversations" simplification the roadmap already called for. A member who turns
their own chat off can't send in groups either (`resolveOwnChatAvailability`).

**The member limit can't be raced.** `chat.maxGroupMembers` (platform settings, 50 by default)
is checked inside the same transaction that locked the conversation row, so two admins adding
people at the same moment run one after the other, and the second sees the first one's additions.
A real test runs exactly that race.

**A group always has an admin.** The last admin can't step down (`LAST_GROUP_ADMIN`). If the last
admin leaves, the member who has been there longest becomes admin in the same transaction. When the
last person leaves, the conversation and its messages are deleted.

**Removal takes effect everywhere at once.** The removed person's participant row is deleted, so
every REST read (`requireParticipant`) refuses them straight away, and the membership consumer
pulls their open sockets out of the room so live messages stop too.

**Read ticks in a group mean "everyone has read it".** `combineReaderCursors` takes the earliest
read and delivered positions across every other member (anyone who hasn't read at all counts as
unread), and the same function gives exactly the old answer in a direct chat, where there's only
one other reader. Event lines never show ticks.

**Event lines are notified sparingly.** A new message notifies every offline recipient as before.
An event line only notifies the people it added ("Sita added you"), so a busy admin renaming a
group or adding others doesn't buzz everyone.

**Group previews name the sender.** A group's `lastMessagePreview` is stored as "Sita: see you
there" (`conversationPreviewFor`), and event lines store their sentence ("Sita added Ram"), so the
chat list reads well without the client knowing who sent the last message.

**A build's chat belongs to the build.** Only the build's owner and editors are ever in it, and
viewers must never get in, so membership changes only through the build
(`buildChatService`). Letting a chat admin add someone from the chat side would quietly give a
non-editor access to the working chat. Build chat changes go through the outbox because they
happen inside the build's transaction; publishing straight away would announce changes that
could still roll back.

**Build invites don't need chat switched on.** The PRD sends a build invite "with a direct link —
no chat needed", so invites and shares check only that the person is an active shopper or brand
account and that neither side has blocked the other (`hasBlockBetween`), not the full
`isChatAvailableBetween` rules.

## Follow-ups

Roadmap, in build order — each phase reuses this module's `isChatAvailableBetween` and event/socket
plumbing rather than introducing a parallel mechanism:

1. Turn Off Chat — done.
2. 1:1 direct messaging, real-time delivery, presence/last-seen, sent/delivered/read receipts,
   image attachments — done.
3. Typing indicators (new Redis Pub/Sub channel — ephemeral/high-frequency, deliberately not routed
   through Redis Streams the way `MESSAGE_CREATED`/`PRESENCE_CHANGED` are).
4. Group chats — done (see "Group chats" above).
5. Admin/Support `ConversationType.SUPPORT` — queue-style, any Admin can view/reply, sender Admin id
   recorded per-message for audit, exempt from `ChatSettings`/`ChatBlock` (already true today via
   `isChatAvailableBetween`'s Admin short-circuit). First real chat UI in `apps/admin`.
6. Remaining hardening not already covered by Phase 2's day-one rate limiting: socket message-size
   caps, reconnection message replay, an origin-allowlist review for the socket handshake (OWASP
   WebSocket Security Cheat Sheet).
