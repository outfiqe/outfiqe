# chat

## Purpose

Chat availability controls: a global "turn off chat" switch and a per-person mutual block
("turn off chat with this person"), enforced server-side for every future chat surface. This is
Phase 1 of a larger real-time chat system (see Roadmap below) — no `Conversation`/`Message` schema
exists yet, since nothing sends messages yet. This module owns the enforcement rule
(`isChatAvailableBetween`) that Phase 2's message-send path will call, so that path never has to
re-derive it.

## Structure

- `chat.routes.ts`, `chat.controller.ts` — route table and thin request/response glue.
- `chat.service.ts` — `getSettings`/`setGlobalChatEnabled`, `blockUser`/`unblockUser`,
  `listBlockedUsers`, `searchContacts`, and `isChatAvailableBetween` (the enforcement rule future
  phases will call before letting a message send).
- `chat.repository.ts` — Prisma access: `ChatSettings` read/upsert, `ChatBlock` create/delete/lookup
  (a single row represents a mutual block, looked up with an `OR` on both directions), and
  `searchContacts` (name/handle match over `User`, excluding Admins and the caller).
- `chat.schemas.ts` — Zod request validation (`updateChatSettingsBodySchema`,
  `chatBlockTargetParamSchema`, `listChatBlocksQuerySchema`, `searchChatContactsQuerySchema`).
- `chat.types.ts` — `ChatContact`, `BlockedChatContact`, `ChatBlocksPage`, `ChatSettingsView`.
- `chat.constants.ts` — search result limit, blocks page size, and the rate-limit tuning for the
  settings/block mutation endpoints.
- `chat.utils.ts` — `toBlockedChatContact`, mapping a `ChatBlock` + `blocked` user row to the
  response shape.
- `chat.socket.ts` — consumes `CHAT_SETTINGS_UPDATED`/`CHAT_BLOCK_LIST_UPDATED` domain events and
  re-emits them to the acting user's own `userRoom`, so a toggle made in one browser tab/device is
  reflected in any other open tab/device without a manual refresh.

## Funnel

**User-facing:** a Creator or Business opens Settings > Chat (`/dashboard/settings/chat`,
`apps/web/src/features/chat-settings`). They can flip a single "Turn off chat" switch (nobody can
message them, and they can't message anyone, until they turn it back on), and separately search for
one person and turn chat off with just that person — a mutual block: neither side can message the
other, and only whoever turned it off can turn it back on. Admin accounts are exempt in both
directions: a user can never block an Admin, and an Admin can never disable their own chat, since
Admin/Support communication (Phase 7) must always be reachable.

**Technical:** `chat.routes` → `chat.controller` → `chat.service` → `chat.repository` → Postgres.
Every mutating call (`setGlobalChatEnabled`, `blockUser`, `unblockUser`) publishes a domain event
(`DomainEvents.CHAT_SETTINGS_UPDATED`/`CHAT_BLOCK_LIST_UPDATED`) after its DB write, which
`chat.socket.ts` picks up and re-broadcasts to the caller's own `userRoom` — the same
persist-then-publish-then-broadcast shape `notifications` already uses, reused here purely for
cross-tab/cross-device sync rather than notifying a second party.

## Non-obvious rationale

**A single `ChatBlock` row represents a mutual block, not two.** "Turn off chat with a specific
person" was locked as symmetric — neither side can message the other while it's active — so there's
no need for both parties to have their own row; `findBlockBetween` looks up either direction with an
`OR`. The row's `blockerId` still matters: only that user can remove it (`unblockUser` deletes by
exact `blockerId`+`blockedId`, so the party who was blocked can't unilaterally lift someone else's
block on them). `blockUser` is idempotent for this reason too — if the pair is already blocked in
either direction, it's a no-op rather than a second row or an error.

**Why a chat-local contact search instead of extending `users`.** The `users` module's only listing
endpoints are Admin-gated (see `../users/README.md`), and the existing public
`creators/autocomplete` only covers `isCreator` users — a Business-side user who isn't a creator
wouldn't be findable. Rather than widen `users`' public surface repo-wide, `searchContacts` is a
narrow, chat-scoped query (excludes the caller and any `ADMIN`) that only this module's settings
picker uses.

**Why `Conversation`/`Message` don't exist yet.** Building them now, ahead of any feature that
writes to them, would be speculative schema no code exercises — this module intentionally ships only
what "Turn Off Chat" needs. The full target architecture (kept here so Phase 2+ doesn't have to
re-derive it):

- **Transport:** Socket.IO, already wired with the Redis adapter (`shared/socket`) — no new
  transport needed.
- **Source of truth:** PostgreSQL. A message is persisted first; socket emission is a best-effort
  side effect after, same as every other module's Redis/socket write.
- **Durable fan-out:** Redis Streams (`shared/events`) for anything that must survive a crashed
  consumer or feed more than one downstream concern — a sent message needs to both broadcast
  live and (if the recipient's offline) create a `Notification`.
- **Ephemeral fan-out:** plain Redis Pub/Sub, not Streams, for typing indicators and presence
  heartbeats specifically (Phase 4/5) — loss-tolerant, high-frequency, and would just bloat a
  durable stream's log for no benefit.
- **Presence:** a Redis key per _connection_ (not per user), TTL + heartbeat-refreshed, so a
  multi-tab/multi-device user reads "online" until their last connection drops (Phase 4).
- **Admin/Support messaging:** a `ConversationType` enum (`DIRECT`/`GROUP`/`SUPPORT`) on the future
  `Conversation` model. `SUPPORT` conversations are queue-style — any Admin can view/reply, the
  sending Admin's id is still recorded per-message for audit, but it's not routed to one specific
  Admin's inbox — and are exempt from `ChatSettings`/`ChatBlock` checks entirely, matching the
  "Admins always reachable" rule this module already enforces (Phase 7).

## Follow-ups

Roadmap, in build order — each phase reuses this module's `isChatAvailableBetween` and event/socket
plumbing rather than introducing a parallel mechanism:

1. Turn Off Chat (this module, done).
2. `Conversation`/`ConversationParticipant`/`Message` schema + REST + 1:1 direct messaging, calling
   `isChatAvailableBetween` on every send.
3. Real-time delivery + delivery/read receipts + unread counts (reusing `notifications`' unread-count
   and preference patterns).
4. Presence + last-seen.
5. Typing indicators (new Redis Pub/Sub channel).
6. Group chats.
7. Admin/Support `ConversationType`, queue-style, audited.
8. New-message integration into the existing `Notification` pipeline + multi-device polish.
9. Socket-level rate limiting/message-size caps + reconnection replay hardening (OWASP WebSocket
   Security Cheat Sheet: origin allowlisting, per-message authorization, payload size caps).
