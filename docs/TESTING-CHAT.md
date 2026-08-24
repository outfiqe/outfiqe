# Outfiqe Chat — Turn Off Chat Test Plan

Covers Phase 1 of the chat system (branch `feat/chat-turn-off-toggle`): the global
"turn off chat" switch and the per-person mutual block, and their server-side
enforcement. Organized as funnels, matching
[TESTING-GAMIFICATION.md](./TESTING-GAMIFICATION.md)'s format. There's no message-send
feature yet (Phase 2+, see `PRD-CHAT.md`) — this plan only covers what actually ships
this phase: the availability controls themselves.

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

## 10. Known accepted limitations — please don't file these as bugs

These are deliberate Phase 1 scope decisions, documented in `PRD-CHAT.md`/
`apps/api/src/modules/chat/README.md`:

- **No actual chat/messaging yet** — no conversation list, no message thread, nothing to
  send. This phase only ships the availability controls those future features will
  enforce against.
- **No presence, typing indicators, delivery/read receipts, or unread counts** — later
  phases (see `PRD-CHAT.md` §2 roadmap).
- **No group chats, no Admin/Support conversation UI** — later phases; Admin has no chat
  surface at all yet, by design (§5 above).
- **No profile-page "message"/block button** — the per-person toggle lives only in
  Settings > Chat for this phase; there's no message entry point yet to attach a
  profile-page control to.
- **The blocked party is never told they've been blocked, in the UI or via any
  notification** — intentional; blocking here is framed as an availability setting, not
  a moderation action with a notice.
- **No admin-facing view of who has chat turned off or who's blocked whom** — not built
  this phase; nothing in Phase 1 required an admin-facing surface for these settings.
