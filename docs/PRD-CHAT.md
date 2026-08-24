# Outfiqe Chat System — PRD

Internal reference doc, committed to the repo. Full behavioral spec of the real-time
chat system: the target architecture for the whole system, and a complete spec of
Phase 1 — "Turn Off Chat" — designed and built this session. Branch:
`feat/chat-turn-off-toggle`. `TESTING-CHAT.md` (also committed) is the human test pass
derived from this.

---

## 1. Goal

Build toward a Messenger-level chat experience — Creator↔Creator, Business↔Creator,
group chats, Admin↔Creator/Business support messaging, presence, typing, delivery/read
receipts, unread counts, multi-tab/device support — without introducing new
infrastructure this codebase doesn't already have, and without a Phase 1 that Phase 2+
has to rewrite around. Phase 1 ships the one piece that has to exist before any of the
rest is safe to build on: a way for a user to make themselves unreachable, enforced
server-side, that every later phase's message-send path can call into rather than
re-derive.

## 2. Architecture decision (applies to every phase)

Researched against current production guidance and audited against what this repo
already runs (full detail: `apps/api/src/modules/chat/README.md`). Summary:

| Concern                    | Decision                                                                                        | Why                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Transport                  | Keep Socket.IO — already running with the `@socket.io/redis-adapter` (`shared/socket`)          | Reconnection/rooms/horizontal-scale story already solved; raw WebSockets would mean rebuilding all of that by hand for no benefit at this scale |
| Source of truth            | PostgreSQL — every mutation persisted first, socket emission is a best-effort side effect after | Matches this codebase's existing "never let a Redis/socket hiccup fail the primary write" convention                                            |
| Durable fan-out            | Redis Streams (existing `shared/events` domain-event bus)                                       | Already durable/replayable/dead-letter-safe; reused for anything that must survive a crashed consumer or feed more than one downstream concern  |
| Ephemeral fan-out (future) | Plain Redis Pub/Sub, not Streams — typing indicators and presence heartbeats only               | Loss-tolerant, high-frequency; would bloat a durable stream's log for no benefit                                                                |
| Cross-node broadcast       | Already solved by the Socket.IO Redis adapter — no hand-rolled bridge needed                    | `io.to(room).emit(...)` already fans out across processes                                                                                       |
| No new messaging system    | Kafka/similar explicitly **not** introduced                                                     | Redis Streams already does the job this system needs; adding a second broker would be pure added surface area for no capability gain            |

Full 9-phase roadmap (Phase 1 below, Phases 2–9 forward-looking) lives in
`apps/api/src/modules/chat/README.md`'s Follow-ups section — not duplicated here to
avoid two copies drifting apart.

## 3. Admin messaging model (decision, applies from Phase 1 onward)

Admin↔user communication will be a distinct `SUPPORT` conversation type (Phase 7), not
peer-to-peer DMs — queue-style: any Admin can view/reply, the sending Admin's id is
still recorded per-message for audit, but it's not routed to one specific Admin's inbox.
This is locked now, in Phase 1, because it drives a rule enforced from day one:
**Admins are always reachable** — no toggle or block in this system ever applies to an
Admin, in either direction, and an Admin can never disable their own chat.

## 4. Phase 1 — "Turn Off Chat"

### 4.1 In scope (built this session)

- A global "turn off chat" switch per user — while off, no one can message them and
  they can't message anyone, until they turn it back on.
- A per-person mutual block ("turn off chat with this person") — neither side can
  message the other while active; only whoever turned it off can turn it back on.
- Server-side enforcement of both (`chat.service.ts`'s `isChatAvailableBetween`),
  independent of any frontend UI.
- Admin exemption, enforced server-side: a user can never block an Admin; an Admin can
  never disable their own chat.
- Real-time cross-tab/cross-device sync of both settings over the existing socket layer.
- A Settings > Chat page in `apps/web` (Creator/Business dashboard) with a contact
  search, a blocked-people list, and the global toggle.

### 4.2 Explicitly out of scope (Phase 1 — not oversights)

- Any actual message sending/receiving — no `Conversation`/`Message` schema exists yet.
  Nothing in this phase writes a chat message; there's nothing to send yet.
- Presence/online/last-seen, typing indicators, delivery/read receipts, unread counts,
  group chats, the Admin/Support conversation type itself. All are later phases (see
  §2) that this phase's enforcement rule and event/socket plumbing are built to support
  without a rewrite, but none of their UI or schema is built now.
- Any chat UI in `apps/admin` — Admin's channel is exempt by design (§3), so there's
  nothing for an Admin to configure yet.
- A profile-page "message"/block button — there's no message entry point yet to hang
  one off; the per-person toggle lives entirely in the new Settings > Chat page instead.

## 5. Actors

| Actor                  | Surface                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| Creator                | `apps/web` `/dashboard/settings/chat` — global toggle, per-person block |
| Business (Brand owner) | Same page, same app — identical behavior to Creator, no special-casing  |
| Admin                  | None yet (§4.2) — exempt from every toggle/block by design (§3)         |

## 6. Data model

```
ChatSettings
  userId          uuid  @id -> User
  isChatEnabled   Boolean  @default(true)
  updatedAt

ChatBlock
  blockerId       uuid -> User
  blockedId       uuid -> User
  createdAt
  // @@id([blockerId, blockedId]) — one row represents a mutual block (see §8)
```

No row exists until a user's first toggle — `getSettings` returns `{ isChatEnabled: true
}` by default when absent, so no backfill migration was needed for existing users.

## 7. Complete flow

1. A Creator or Business opens Settings > Chat.
2. **Global toggle**: flipping it calls `PATCH /api/chat/settings`. The service rejects
   the call outright (403 `ADMIN_CHAT_ALWAYS_ON`) if the caller is an Admin turning it
   off; otherwise it upserts `ChatSettings` and publishes `DomainEvents
.CHAT_SETTINGS_UPDATED`, which `chat.socket.ts` re-broadcasts to the caller's own
   `userRoom` — any other open tab/device for that same user updates live.
3. **Per-person block**: the user searches a name/handle (`GET
/api/chat/blocks/search`, excludes Admins and the caller — see §8) and clicks
   "Turn off chat" on a result. `POST /api/chat/blocks/:userId` rejects a self-target
   (400 `CANNOT_BLOCK_SELF`) and an Admin target (400 `CANNOT_BLOCK_ADMIN`); otherwise
   it creates a single `ChatBlock` row (idempotent — a second call, from either party,
   is a no-op) and publishes `CHAT_BLOCK_LIST_UPDATED` the same way.
4. The blocked-people list (`GET /api/chat/blocks`, cursor-paginated) shows everyone
   the caller has personally blocked, each with a "Turn chat back on" action —
   `DELETE /api/chat/blocks/:userId` only succeeds when the caller is the row's
   `blockerId`; a party who was blocked (not the initiator) gets a silent no-op, not an
   error, so the block's existence is never confirmed/denied to the other side.
5. **Enforcement for future phases**: `chatService.isChatAvailableBetween(userA,
userB)` — `true` immediately if either party is an Admin; otherwise `false` if a
   `ChatBlock` exists between them or either party's `ChatSettings.isChatEnabled` is
   `false`. Phase 2's message-send endpoint calls this before allowing a send; nothing
   about it needs to change when that phase lands.

## 8. Business rules locked this session

| Decision                                                           | Answer                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Does the global toggle/block apply to Admin/Support messaging?     | **No.** Admins are always reachable, in both directions, matching the queue-style `SUPPORT` model locked for Phase 7 (§3).              |
| Is a per-person toggle mutual or one-directional?                  | **Mutual.** Turning off chat with someone disables messaging in both directions; matches standard block semantics.                      |
| Who can undo a per-person block?                                   | **Only whoever initiated it** — `blockerId` on the single `ChatBlock` row is the source of truth; the blocked party can't self-unblock. |
| Where does the Phase-1 UI for picking a person live?               | **A dedicated Settings > Chat page**, not a profile-page button — there's no chat/message entry point yet to attach one to.             |
| Does chat settings management ship in `apps/admin` for this phase? | **No** — nothing for an Admin to configure yet, since their channel is exempt by design.                                                |

## 9. Non-obvious rationale

**A single `ChatBlock` row, not two, represents a mutual block.** Since the effect is
symmetric regardless of who initiated it, one row (looked up with an `OR` on both
directions) is sufficient — see `apps/api/src/modules/chat/README.md` for the full
reasoning, including why `blockUser` is idempotent and why only the initiator can
`unblockUser`.

**A new, narrow contact-search endpoint instead of widening the `users` module.** The
`users` module's only listing routes are Admin-gated, and the existing public
`creators/autocomplete` only covers `isCreator` accounts — a Business-side user who
isn't also a creator wouldn't be findable there. Rather than open up `users`' public
surface repo-wide, `GET /chat/blocks/search` is a chat-module-owned query, scoped to
exactly what this picker needs (excludes Admins and the caller).

**Why `Conversation`/`Message` don't exist yet.** Building them now, ahead of any
feature that actually writes to them, would be speculative schema no code exercises.
Everything Phase 1 needs — the enforcement rule, the event/socket plumbing shape — is
already in place for Phase 2 to build directly on top of.

## 10. Security & compliance

Same ASVS-aligned bar the rest of this codebase holds itself to (`CLAUDE.md`
"Security" section):

- Every mutating endpoint requires `requireAuth`; the admin exemption and self/target
  validation happen in the service layer, never trusting a client-supplied role or id.
- `PATCH /chat/settings` and `POST`/`DELETE /chat/blocks/:userId` are rate-limited
  (`rateLimit()`, keyed on the caller's user id) — the same public-write-endpoint
  standard every other mutation in this codebase already holds itself to.
- No information leak about who blocked whom: an unauthorized `DELETE` attempt returns
  the same success response as a real unblock, rather than confirming or denying the
  block's existence or its direction to the calling party.
- No new PII surface — `ChatSettings`/`ChatBlock` store only user ids and a boolean/
  timestamp; the contact search returns only `id`/`name`/`handle`/`avatarUrl`, the same
  minimal shape every other public user-facing list in this codebase already exposes.

## 11. Resilience & edge cases

- **A user with no `ChatSettings` row** (never touched their setting) — treated as
  `isChatEnabled: true` by default, not an error or a forced onboarding step.
- **Blocking someone who blocked you first** — idempotent; the existing row stays
  owned by the original initiator, no duplicate row, no error.
- **Unblocking a block you didn't initiate** — silent no-op, `200` response, no
  information disclosed either way (§10).
- **Searching while the target has chat turned off globally** — still found and
  blockable; a personal block and someone's own global toggle are independent
  settings, and blocking doesn't require them to be currently reachable.
- **Empty states** — an empty blocked-people list and an empty search-result list both
  render an explicit message, never a bare blank area, matching this codebase's
  standing empty-state requirement.
- **Multiple tabs/devices** — a toggle made in one tab is reflected in any other open
  tab/device for that same user within the same request cycle, via the socket
  broadcast described in §7 step 2/3 — verified in `ChatAvailabilitySettings
.integration.test.tsx`'s socket-event test.

## 12. Chunk plan (as built)

Built chunk-by-chunk, one commit per chunk, on `feat/chat-turn-off-toggle`:

1. Schema — `ChatSettings`/`ChatBlock` Prisma models + migration.
2. Core logic — `chat.repository.ts`/`chat.service.ts`, every enforcement rule from §8.
3. API surface — schemas/controller/routes, rate limiting, an 11-case integration
   test suite covering every rule in §8/§11.
4. Real-time sync — new domain events + socket events, `chat.socket.ts` consumer.
5. Frontend data layer — `packages/types`/`packages/client`/`packages/hooks` (extracted
   a shared `socketEventAdapter` since `useNotificationSocket` needed the identical
   shape — reuse over duplication).
6. Frontend UI — Settings > Chat page, split into a testable `ChatAvailabilitySettings`
   - thin `SiteChatAvailabilitySettings` wrapper (mirrors `NotificationBell`/
     `SiteNotificationBell`'s split exactly, for the same testability reason), a 5-case
     component test suite.
7. Docs — both module READMEs (this doc's companion detail lives there), this PRD,
   and `TESTING-CHAT.md`.

**How to apply Phase 2+:** read `apps/api/src/modules/chat/README.md`'s Follow-ups
section for the full roadmap, and call `chatService.isChatAvailableBetween` from the
new message-send path rather than re-deriving any of §8's rules.
