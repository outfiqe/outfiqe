# Outfiqe Chat — Test Plan

Covers Phase 1 (availability controls) and Phase 2 (1:1 messaging, real-time delivery, presence,
receipts) of the chat system, both on branch `feat/chat-turn-off-toggle`. Organized as funnels,
matching [TESTING-GAMIFICATION.md](./TESTING-GAMIFICATION.md)'s format. §2–9 cover Phase 1
(unchanged); §11+ cover Phase 2. Typing indicators, group chats, and Admin/Support conversations
aren't built yet (see `PRD-CHAT.md`) — nothing below tests them.

## 1. Test accounts you'll need

| Role           | How to get one                                                                                   | Notes                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Creator A      | Seeded demo accounts `creator1@example.com`…`creator5@example.com`, password `demo-password-123` | The primary account you'll toggle settings on                         |
| Creator B      | Any other seeded creator account                                                                 | The "other person" for the per-person block funnels                   |
| Business owner | Apply at `/apply` → admin approves → invite email → register                                     | Confirms the feature behaves identically for `BRAND_OWNER` accounts   |
| Admin          | Seeded via `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` in `apps/api/.env`                 | Only needed for the admin-exemption funnel (§5) — no chat UI to visit |

You'll want **two browser profiles/sessions signed in as Creator A** for the multi-tab
sync funnel (§7), and **Creator A + Creator B** signed in separately for the mutual-block
funnels (§3/§4).

---

## 2. Funnel: Global "Turn off chat"

- [ ] Sign in as Creator A, open Settings > Chat (`/dashboard/settings/chat`) — confirm the "Turn off chat" toggle starts **unchecked** (chat is on by default for an account that's never touched this setting).
- [ ] Check the toggle — confirm it flips immediately (optimistic) and stays checked after the request resolves; refresh the page and confirm it's still checked.
- [ ] Uncheck it — confirm it flips back and stays off after refresh.
- [ ] Repeat both directions as a Business owner account — confirm identical behavior; nothing about this toggle should special-case the role.
- [ ] With chat turned off, hit `GET /api/chat/settings` directly (or just refresh the page) — confirm the server, not just local UI state, reports `isChatEnabled: false`.

## 3. Funnel: Turning off chat with a specific person

- [ ] As Creator A, in the "Turn off chat with a specific person" search box, type Creator B's name or handle — confirm results appear (debounced, not on every keystroke) and Creator A themself never appears in their own search results.
- [ ] Click "Turn off chat" on Creator B's result — confirm the button becomes disabled while the request is in flight, and Creator B then appears in the "Turned off for these people" list below without a page refresh.
- [ ] Search for Creator B again — confirm they no longer appear in search results once already blocked (already-blocked contacts are filtered out of the picker).
- [ ] Refresh the page — confirm Creator B is still in the blocked list (server-persisted, not just local state).
- [ ] As Creator B (separate session), search for and attempt to block Creator A back — confirm this succeeds without creating a visible duplicate/error (idempotent — the pair is already mutually blocked from Creator A's earlier action).

## 4. Funnel: Turning chat back on

- [ ] As Creator A, with Creator B in the blocked list, click "Turn chat back on" next to them — confirm the row disappears from the list immediately, and the empty state ("You haven't turned off chat with anyone") appears if that was the only blocked contact.
- [ ] As Creator B, attempt to remove the same block from **their own** account (if any UI/API path lets them target Creator A's block) — confirm it has no effect on the actual block state and returns a generic success rather than an error that would confirm who blocked whom.
- [ ] Search for Creator B again as Creator A after unblocking — confirm they now reappear in search results (no longer filtered as blocked).

## 5. Funnel: Admin exemption

- [ ] As Creator A, search for an Admin account by name/handle — confirm the Admin never appears in search results at all (excluded from the picker, not just unblockable).
- [ ] Attempt `POST /api/chat/blocks/:adminUserId` directly against an Admin's user id — confirm it's rejected (`400`, `CANNOT_BLOCK_ADMIN`), not silently accepted.
- [ ] Sign in as Admin (or issue an Admin-role token directly against the API) and attempt `PATCH /api/chat/settings` with `isChatEnabled: false` — confirm it's rejected (`403`, `ADMIN_CHAT_ALWAYS_ON`).
- [ ] `GET /api/chat/settings` as an Admin — confirm it always reports `isChatEnabled: true`, regardless of any stored value.
- [ ] Confirm there is no Settings > Chat page (or equivalent) anywhere in `apps/admin` — this phase intentionally ships no chat UI for Admin accounts.

## 6. Funnel: Self and validation guards

- [ ] Attempt `POST /api/chat/blocks/:ownUserId` (block yourself) — confirm it's rejected (`400`, `CANNOT_BLOCK_SELF`).
- [ ] Attempt to block a user id that doesn't exist — confirm a clean `404`, not a raw database error.
- [ ] Attempt every mutating endpoint (`PATCH /chat/settings`, `POST`/`DELETE /chat/blocks/:userId`) without an `Authorization` header — confirm all are rejected `401`, enforced server-side rather than only hidden client-side.

## 7. Funnel: Multi-tab / multi-device sync

- [ ] Sign in as Creator A in two browser tabs (or two browsers), both open on Settings > Chat.
- [ ] Toggle "Turn off chat" in tab 1 — confirm tab 2's toggle updates to match within a couple of seconds, with no manual refresh.
- [ ] Block a person in tab 1 — confirm the blocked list in tab 2 updates (either the new entry appears directly, or the list quietly refetches) without a manual refresh.
- [ ] Disconnect tab 2's network briefly (devtools offline toggle), make a change in tab 1, then reconnect tab 2 — confirm tab 2 reconciles to the current server state once its socket reconnects, rather than staying stale indefinitely.

## 8. Funnel: Pagination and search edge cases

- [ ] Block enough different people (5+) to exceed one page of the blocked-people list, if the page size allows reaching it in a test environment — confirm a "Load more" control appears and correctly appends the next page without duplicating or dropping rows already shown.
- [ ] Search with a query that matches nobody — confirm a clear "No one found for '...'" message, not a blank area or a spinner that never resolves.
- [ ] Clear the search box back to empty — confirm the result list disappears rather than showing stale results or an empty-state message meant for a real "no matches" case.

## 9. Funnel: Rate limiting

- [ ] Rapidly repeat `PATCH /api/chat/settings` (or block/unblock the same target) well beyond the configured window/max in `chat.constants.ts` — confirm the request eventually comes back `429` with a `Retry-After` header, rather than succeeding indefinitely.

---

## 10. Known accepted limitations (Phase 1) — please don't file these as bugs

- **The blocked party is never told they've been blocked, in the UI or via any
  notification** — intentional; blocking here is framed as an availability setting, not
  a moderation action with a notice.
- **No admin-facing view of who has chat turned off or who's blocked whom** — not built
  this phase; nothing in Phase 1 required an admin-facing surface for these settings.

---

## 11. Test accounts for Phase 2

Reuse §1's accounts. You'll want **Creator A and Creator B signed in separately** (two browser
profiles) for send/receive funnels, and to be able to make one of them go offline (close its
browser/tab entirely, not just navigate away) to test the offline-notification and presence
funnels.

## 12. Funnel: Starting a conversation

- [ ] As Creator A, visit Creator B's profile (not your own) and confirm a "Message" button shows
      next to Follow — click it and confirm the floating chat panel opens directly into a thread with
      Creator B (empty, "Say hello").
- [ ] Visit your own profile — confirm no "Message" button appears (only "Edit profile").
- [ ] Visit a Business profile you're not a member of — confirm "Message" shows (assuming that
      brand has an owner account) and opens a thread with the brand's contact person, not a generic
      "brand" identity.
- [ ] Visit your own Business's public profile (as its owner) — confirm no "Message" button shows.
- [ ] As a signed-out visitor, click "Message" on any profile — confirm you're redirected to
      `/login?redirect=...` rather than silently failing or erroring.
- [ ] Click "Message" on the same person twice (e.g. leave and revisit their profile) — confirm you
      land in the same conversation both times, not a duplicate.

## 13. Funnel: Sending and receiving messages

- [ ] Send a text-only message — confirm it appears immediately in your own thread, and live
      (no refresh) in Creator B's thread if they have it open.
- [ ] Send an emoji from the emoji picker — confirm it inserts into the text box and sends
      normally.
- [ ] Attach 1–6 photos (with or without text) and send — confirm thumbnails preview before
      sending, the sent message shows the photo(s), and attempting a 7th photo is blocked.
- [ ] Attempt to send with no text and no photos — confirm the send button stays disabled /
      nothing is sent.
- [ ] Close the chat panel and reopen it (or reload the page) — confirm history persists and
      loads correctly, newest at the bottom.
- [ ] Scroll to the top of a long thread — confirm older messages load automatically (infinite
      scroll upward) without losing your scroll position.
- [ ] From the panel, click the expand icon — confirm it navigates to `/messages/:conversationId`
      showing the same conversation, and the panel closes.
- [ ] Visit `/messages` directly — confirm the conversation list renders, and selecting a
      conversation shows its thread in the same two-pane layout.

## 14. Funnel: Delivery and read receipts

- [ ] Send a message to Creator B while Creator B is **offline** (not connected) — confirm your
      own message shows a single check (sent, not delivered).
- [ ] Have Creator B come online (open the app) — confirm your sent message's tick updates to a
      double check (delivered) without you refreshing.
- [ ] Have Creator B open the conversation thread — confirm your tick updates to a colored double
      check (read), live.
- [ ] As Creator B, confirm you never see delivery/read ticks on messages Creator A sent to you
      (ticks only ever show on your own sent messages).

## 15. Funnel: Presence and last seen

- [ ] With Creator B online and their thread open (as Creator A), confirm the thread header shows
      a green dot and "Active now".
- [ ] Have Creator B close their browser/tab entirely — confirm Creator A's open thread updates,
      within a few seconds, to "Active just now" / "Active Xm ago" (no green dot), without a refresh.
- [ ] Confirm the same online dot appears next to Creator B's row in Creator A's conversation
      list.

## 16. Funnel: Unread counts and offline notification

- [ ] Send a message to Creator B while Creator B is offline — confirm, once Creator B signs back
      in, they see a `NEW_MESSAGE` notification (bell) in addition to the unread badge on the chat
      launcher and the conversation row.
- [ ] Send a message to Creator B while Creator B is online but the panel is closed — confirm the
      floating launcher's unread badge increments live.
- [ ] Have Creator B open the conversation — confirm the unread badge (both on that row and the
      launcher total) clears.

## 17. Funnel: Enforcement carries over from Phase 1

- [ ] Start a conversation between Creator A and Creator B, exchange a message, then have either
      side turn off chat globally (Settings > Chat) or block the other person — confirm the next send
      attempt from the still-willing side is rejected (`CHAT_UNAVAILABLE`), even though the
      conversation and its history already exist.
- [ ] Attempt to send a message as a user who isn't a participant in a given conversation id
      (e.g. via the API directly) — confirm it's rejected (`403`, `NOT_A_PARTICIPANT`).

---

## 18. Known accepted limitations (Phase 2) — please don't file these as bugs

- **No typing indicators, group chats, or Admin/Support conversations** — later phases (see
  `PRD-CHAT.md` §2 roadmap and `apps/api/src/modules/chat/README.md` Follow-ups).
- **No message editing, deletion, or reactions.**
- **"Delivered" has no client-side acknowledgement** — it's inferred from live presence at send
  time or the recipient's next thread fetch, not a dedicated ack round trip; in rare timing edge
  cases a message could show "sent" slightly longer than it was technically deliverable.
- **No chat UI in `apps/admin`** — unchanged from Phase 1, by design.
