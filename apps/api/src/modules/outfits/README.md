# outfits

## Purpose

Outfit Build: people put one complete outfit together on a shared board, alone or with up to
five editors, agree on it, lock it, and choose who can see it. This module holds the data model,
its database rules, the board's REST API, live socket updates, the build's chat lines and its
notifications. The web board and the rest of the feature are added on top (see
`docs/PLAN-OUTFIT-BUILD.md`). Everything stays behind the `outfit_builder` feature flag.

## Structure

- `outfit.routes.ts` — `/api/outfits`. Every route needs a signed-in, active account and the
  `outfit_builder` flag. Every write also needs an `Idempotency-Key` header and is rate limited
  per person (30 board edits a minute, 20 new builds an hour).

  | Route                                                                                                    | What it does                                                       |
  | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
  | `GET /` · `GET /shared-with-me`                                                                          | My Builds, and builds sent to me (cursor pages)                    |
  | `POST /`                                                                                                 | Start a build, alone or from a chat (`sourceConversationId`)       |
  | `GET /:id`                                                                                               | The board, or the published version for someone it was shared with |
  | `GET /:id/events?sinceVersion=`                                                                          | History after a version, to catch up after a dropped connection    |
  | `PUT /:id/slots/:slotKey/positions/:position`                                                            | Add or swap an item                                                |
  | `DELETE /:id/slots/:slotKey/positions/:position`                                                         | Remove an item                                                     |
  | `PUT /:id/slots/:slotKey/order`                                                                          | Reorder the items in a slot that holds several                     |
  | `PATCH /:id/settings`                                                                                    | Title, budget, per-person item limit (owner)                       |
  | `PUT /:id/happy`                                                                                         | "I'm happy" on or off                                              |
  | `POST /:id/lock` · `/unlock` · `/archive`                                                                | Owner only                                                         |
  | `POST /:id/members` · `DELETE /:id/members/:userId` · `POST /:id/leave` · `POST /:id/transfer-ownership` | People                                                             |
  | `PUT /:id/visibility` · `DELETE /:id/shares/:userId`                                                     | Private, shared (sent to named people) or public                   |

- `outfit.controller.ts` — reads the `If-Match` version and the idempotency key, and sends every
  write's new version back in the body and as an `ETag`.
- `outfit.write.ts` — `runOutfitWrite`, the one path every board change takes (see Funnel).
- `outfit.service.ts` — starting, reading and listing builds; items; settings; "I'm happy"; lock,
  unlock and archive.
- `outfit-member.service.ts` — adding and removing editors, leaving, handing over ownership, and
  keeping the build's group chat in step (through `../chat/build-chat.service.ts`).
- `outfit-visibility.service.ts` — private, shared and public, and who a build was sent to.
- `outfit.people.ts` — who can be invited or sent a build: an active shopper or brand account
  that hasn't blocked the owner and isn't blocked by them.
- `outfit.board.ts` — loads a board and the admin limits and builds the board view.
- `outfit.repository.ts` — every query, including the version check (`bumpVersion`).
- `outfit.utils.ts` — pure mappers: live price (list price minus any active brand discount),
  stock status in words, the board and summary views, snapshot items, and `If-Match`/`ETag`
  parsing.
- `outfit.access.ts` — `resolveLiveBoardRole`: owner, editor, or viewer from the chat the build
  started in, or nobody. Used by `GET /:id`, the history endpoint and the socket room guard.
- `outfit.changes.ts` — `recordOutfitChange`, called for every change inside its transaction: the
  history row, an `outfit.changed` outbox row (live updates), an `outfit.activity` outbox row
  (notifications), and a line in the build's chat for the changes worth saying out loud (items
  added, swapped or removed, everyone happy, locked, unlocked).
- `outfit.announcement.ts` — the shape of those two outbox payloads and how to read them back.
- `outfit.socket.ts` — the socket side, for clients: `outfit:subscribe` / `outfit:unsubscribe`
  join or leave the build's room (`outfit:<id>`) after checking the flag and
  `resolveLiveBoardRole`; `outfit:sync { outfitId, sinceVersion }` answers with
  `outfit:sync-result`, the same page as `GET /:id/events`. Socket messages are limited to 60 a
  minute per person.
- `outfit.realtime.ts` — the `outfit.changed` handler (realtime queue, `api` process role): emits
  `outfit:updated { outfitId, version, eventType, actorId }` to the room, and when an editor is
  removed or leaves, pulls their sockets out of the room and sends them `outfit:removed` unless
  they can still watch from the chat the build started in.
- `outfit.notifications.ts` — the `outfit.activity` handler (notify queue, `worker` role): board
  edits become one grouped "Sita and Ram changed your build" alert per 30-second window
  (`activityWindowGroupKey`); everyone being happy tells the owner it's ready to lock; locking
  tells everyone else on the build; invites, shares and going public tell the people involved.
- `outfit.stock.ts` — the `stock.changed` handler (inventory queue, `worker` role) and the
  `outfit.items-sold-out` handler (notify queue). See "Sold-out items" below.
- `outfit-stock.repository.ts` — claims newly sold-out draft items and releases restocked ones,
  and finds replacement products.
- `outfit-replacements.service.ts` — `GET /:id/slots/:slotKey/positions/:position/replacements`:
  up to six in-stock products of the same product type that aren't on the board, from the same
  brand first, then closest in price. Owners and editors only; anyone else gets 404.
- `outfit-publish.service.ts`, `outfit-publish.repository.ts` — posting a locked build as the
  caller's own Creator Look (`POST /:id/look`) and telling them whether a newer version has been
  locked since (`GET /:id/look`). See "Posting a build as a Creator Look" below.
- `outfit-social.service.ts`, `outfit-social.repository.ts`, `outfit-social.controller.ts`,
  `outfit-social.types.ts` — the public side of builds: the Builds feed (`GET /public`, with
  `category`, `minPrice`, `maxPrice`, `inStockOnly`, `contributorId` and `brandId` filters),
  saved builds (`GET /saved`), a build's public view (`GET /:id/public`), likes and saves
  (`PUT`/`DELETE /:id/like`, `/:id/save`), comments with one level of replies
  (`GET`/`POST /:id/comments`, `GET /:id/comments/:commentId/replies`,
  `DELETE /:id/comments/:commentId`), and removal by a moderator (used by `../content-reports`).
  See "Builds in public" below.
- `outfit-cart.service.ts` / `outfit-cart.repository.ts` — "Buy the full set" and "Pick your
  own items" (`POST /:id/cart`): checks which version the shopper may buy from, adds the chosen
  sizes through `cartService.addItems`, explains every item left out, and records an
  `outfit_build_visits` row per added item for attribution. See "Buying from a build" below.
- `outfit.errors.ts`, `outfit.schemas.ts`, `outfit.types.ts`, `outfit.constants.ts`.
- Tests: `outfit.board.integration.test.ts` (starting, items, slot rules, versions, retries,
  simultaneous edits, who can see what), `outfit.lifecycle.integration.test.ts` (agreeing,
  locking, people, the build chat, sharing), `outfit.live.integration.test.ts` (the build card,
  chat lines, notifications), `outfit.constraints.integration.test.ts` (database rules),
  `outfit.stock.integration.test.ts` (sold-out alerts, replacements),
  `outfit.publish.integration.test.ts` (posting as a look), `outfit.social.integration.test.ts`
  (the feed, filters, likes, saves, comments, reports), `outfit.cart.integration.test.ts`
  (buying from a build, Build commission split), `outfit.utils.test.ts`,
  `outfit.socket.test.ts`, `outfit.realtime.test.ts`.

The tables (`apps/api/prisma/schema.prisma`, migration `20260929200000_add_outfit_build_data_model`):

| Table              | Holds                                                                                                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outfits`          | Status (draft, locked, archived), who can see it (private, shared, public), the version number every change bumps, title, budget in whole rupees, the owner's per-person item limit, the chat it was started from, its own group chat, and the version shared or public viewers see (`published_version`) |
| `outfit_members`   | The owner and editors, each with an "I'm happy" flag                                                                                                                                                                                                                                                      |
| `outfit_shares`    | The people a Shared build was sent to                                                                                                                                                                                                                                                                     |
| `outfit_slots`     | The build's own copy of the slot types, taken when it was created                                                                                                                                                                                                                                         |
| `outfit_items`     | The product in each slot position and who added it                                                                                                                                                                                                                                                        |
| `outfit_photos`    | Cover and try-on photos, linked to the image pipeline's asset                                                                                                                                                                                                                                             |
| `outfit_events`    | One history row per version, used to catch up after a dropped connection                                                                                                                                                                                                                                  |
| `outfit_snapshots` | The items, prices, total and contributors saved at each lock                                                                                                                                                                                                                                              |

`creator_looks.source_outfit_id` / `source_outfit_version` link a Creator Look back to the build
version it was published from, `messages.outfit_id` (kind `OUTFIT_CARD`) carries a build card in a
chat, and `commission_tiers.scope` separates Build commission tiers from Creator Look ones.

Builds in public (migration `20261001090000_add_outfit_build_social`): `outfit_likes`,
`outfit_saves` and `outfit_comments` (with `parent_comment_id` for replies), counts on `outfits`
(`like_count`, `save_count`, `comment_count`), `made_public_at` (feed order) and `removed_at` (set
when a moderator takes the build down). A partial index on public, not-removed builds keeps the
feed query cheap.

Buying from a build (migration `20261003100000_add_outfit_build_commission`):
`outfit_build_visits` (who added which product to their bag from which build version), and on the
commission side `creator_commissions.recipient_brand_id` / `build_visit_id` and
`order_items.attributed_outfit_id` / `attributed_outfit_version`.

## Funnel

**User-facing**: someone starts a build from My Builds or from a chat, fills its slots with
products from any brand, invites up to four more people (who get a group chat for the build),
everyone taps "I'm happy", and the owner locks it. The owner can then send it to chosen people or
make it public; those people see the locked version, not the working board. Unlocking reopens it
for changes; archiving hides it.

**Technical**: route → `requireActiveAuth` → `requireFeatureFlag("outfit_builder")` →
`requireIdempotencyKey` → rate limit → `validate` → controller → service → `runOutfitWrite`:

1. Claim the idempotency key (`withIdempotentTransaction`). A replay returns the stored answer.
2. In one transaction: check the caller is a member with the right role (anyone else gets 404),
   bump the version only if it still equals `If-Match` (otherwise 409 with the current version),
   check the build's status, apply the change, write one `outfit_events` row for the new version
   and one `outfit.changed` outbox row, mark the key completed, and load the fresh board.
3. The outbox relay hands `outfit.changed` to the realtime queue, which tells everyone watching
   the board the new version; their browsers apply it or catch up with `outfit:sync`. It hands
   `outfit.activity` to the notify queue, which sends the notifications.

Starting a build from a chat also posts a build card (`MessageKind.OUTFIT_CARD`, carrying only
the build id) into that chat in the same transaction; the card loads the build live.

**Sold-out items**: every stock change already writes a `stock.changed` outbox row with the
changed size ids (`products` module). `flagSoldOutBoardItems` then, in one transaction:

1. Sets `outfit_items.sold_out_alerted_at` on draft-build items whose product now has no stock in
   any size, but only where it was still empty. Whatever it set is what it alerts about.
2. Clears it on items whose product has stock again, so a later sell-out alerts again.
3. Writes one `outfit.items-sold-out` row per build (notify queue → one `OUTFIT_ITEMS_SOLD_OUT`
   notification to the owner and each editor) and one `outfit.availability-changed` row per build
   whose items changed either way (realtime queue → `outfit:availability-changed` to the room, so
   open boards refetch).

The board already shows the item as out of stock, and locking already refuses while anything is
sold out (`ITEMS_SOLD_OUT`). The web app offers the replacements endpoint from the sold-out item.

**Posting a build as a Creator Look**: an owner or editor who is an approved creator can post the
build's most recent locked version as their own look, with their own photos, caption and the
size they wore of each item:

1. `POST /:id/look` with `{ imageUrls, imageAssetIds?, caption?, layout?, sizesWorn }`. The build
   must be locked right now (`409 OUTFIT_NOT_LOCKED`), and `sizesWorn` must name exactly the
   products in the locked version (`422 SIZES_WORN_MISMATCH`).
2. The look is made by `creatorLookService.create`, the same code as any other look, so tag
   review, the tag limit, commission and feed events all behave the same. It is stamped with
   `source_outfit_id` / `source_outfit_version`.
3. The same creator posting the same version again gets the look they already have (`200`
   instead of `201`), whether the second request came later or at the same moment.
4. When the owner unlocks, changes and locks again, the `outfit.activity` handler sends
   `OUTFIT_NEW_VERSION_AVAILABLE` to every creator whose latest look came from an older version.
   `GET /:id/look` then answers `isOutdated: true`, and posting again makes a new look for the
   new version. The old look stays as it was.

**Builds in public**: making a build public runs the shared content check on its title
(`#lib/content-check.utils.js`, see `../content-reports/README.md`) and stamps `made_public_at`.
Who can see and react:

| Build is | Can see it and its comments               | Can like, save and comment                    |
| -------- | ----------------------------------------- | --------------------------------------------- |
| Public   | Anyone, while `outfit_public_feed` is on  | Any signed-in person who isn't staff          |
| Shared   | Its members and the people it was sent to | The same people, while `outfit_builder` is on |
| Private  | Nobody here (members use the board)       | Nobody                                        |
| Removed  | Nobody                                    | Nobody                                        |

Anyone else gets 404. Comments are checked by the same content check. Reports of a build or a
build comment go into the shared moderation queue (`../content-reports`), and removing one calls
`outfitSocialService.removeBuild` / `removeComment` here, which audit the removal.

**Buying from a build**: `POST /:id/cart` with `{ isFullSet, sizes: [{ productId, sizeLabel }] }`,
shopper accounts only, rate limited.

1. Members buy from the build's latest locked version (while `outfit_builder` is on for them);
   everyone else buys from the version they can see, through the same access rules as the table
   above. Anyone else gets 404.
2. The full set takes every item in that version; "pick your own" takes only the items sent.
   Each item is added in its chosen size, or listed in `leftOut` with a reason: not in the build,
   no longer sold, no size chosen, size not offered, or sold out in that size.
3. Added items go into the normal bag (`cartService.addItems`, clamped to stock like any add),
   and one `outfit_build_visits` row is written per added item. At checkout that visit competes
   with tag and link clicks for attribution, and a build sale pays Build commission split among
   the build's contributors (see `../orders/README.md` and `../commissions/README.md`).

`GET /:id/public` includes each item's buyable sizes so the web app can offer them; an item counts
as in stock only if one of its buyable sizes is.

## Non-obvious rationale

- **The feed shows the locked version, filtered in SQL.** Price, style, brand, contributor and
  "everything in stock" filters all read the published snapshot (`jsonb_to_recordset` over its
  items) in one query, so the card a viewer sees is exactly what was filtered. Stock is checked
  live against `product_sizes`, since a locked build's items can sell out later.
- **Removing a build hides it, it doesn't delete it.** `removed_at` takes it out of every public
  view, but the owner still has the board, its history and any looks made from it.
- **Deleting a top-level comment hides its replies too,** and the build's comment count drops by
  all of them, so the count always matches what people can see.
- **A sold-out item alerts once per sell-out, not once per stock change.** A flash sale can
  change the same product's stock hundreds of times a minute. The alert is claimed with a single
  `UPDATE … WHERE sold_out_alerted_at IS NULL`, so repeated or simultaneous stock events for the
  same item can't send a second alert, and several items selling out in one stock change become
  one notification per person. Live boards are only told when an item actually flips between
  sold out and in stock.
- **One look per creator per locked version, enforced by the database.** The unique index on
  `(creator_id, source_outfit_id, source_outfit_version)` is what makes posting safe to repeat. A
  creator who deletes that look can't post the same version again, because the deleted row still
  holds the slot (`409 LOOK_FROM_VERSION_DELETED`); a newly locked version can be posted.
- **Availability changes don't bump the build version.** The version counts changes people make,
  and writes check it (`If-Match`). A sell-out isn't a change to the build, so bumping the version
  would make everyone's next edit fail with a conflict. The board learns about it from
  `outfit:availability-changed` and refetches instead.

- **Chat lines are written inside the build's transaction; notifications aren't.** A chat line is
  part of the build's record (it must appear exactly once, and never for a change that rolled
  back), so it's saved with the change. Notifications go through the outbox to the notify queue,
  where a slow notification never holds up the board; they're safe to deliver twice because
  one-off alerts carry the outbox event id as their `sourceEventId` and grouped ones just re-add
  the same person.
- **Live updates only say "version N now".** The socket event carries the version, not the new
  board, so a browser that missed an event notices the gap and catches up from history instead
  of applying a stale copy, and nothing private is broadcast to the room.
- **Invites don't also raise a chat alert.** Adding editors writes an `OUTFIT_EDITORS_ADDED` line,
  which doesn't notify anyone, because the build's own `OUTFIT_INVITED` notification already
  carries the direct link.

- **One version number decides every race.** A write only goes through if the build is still at
  the version the person last saw; the conditional update also locks the build's row until the
  transaction ends, so counts taken after it (items per person, editors) can't be raced. Losers
  get `409 OUTFIT_VERSION_CONFLICT` with the current version and refetch. The server never retries
  a conflict; only short database hiccups (deadlocks) are retried.
- **Membership changes and visibility changes bump the version too.** Every change gets its own
  history row, which is what makes `GET /:id/events?sinceVersion=` a complete catch-up. The cost
  is that an item edit sent at the same moment as, say, an invite conflicts and is retried by the
  person's browser.
- **The idempotency key is completed inside the same transaction as the change**
  (`withIdempotentTransaction`), so a crash can never leave a change saved but its key stuck as
  "still processing". The request body the key is checked against includes the build id and
  expected version, so one key can't be reused for a different build or version.
- **Prices are always worked out on the server.** A request only ever names a product; anything
  else in the body is refused. Totals use the live price; the snapshot saved at lock keeps the
  prices at that moment for history and commission.
- **Any change to the outfit clears everyone's "I'm happy"** — adding, swapping, removing or
  reordering items, and unlocking. Title, budget and the per-person limit don't change the outfit,
  so they don't.
- **Only in-stock, on-sale products can be placed.** An item can still sell out later; the board
  shows it as out of stock, and locking refuses until it's swapped (`ITEMS_SOLD_OUT`).
- **Viewers aren't member rows.** Only the owner and editors are members. Someone in the chat the
  build started in sees the live board read-only, without the build's own chat. Someone a build
  was sent to (or anyone, once public) sees the published snapshot — never the working board.
  Everyone else gets 404, so they can't even tell the build exists.
- **Sharing needs a lock, and public needs its own flag.** Shared and public builds show the most
  recent locked version (`published_version`); unlocking to make changes leaves that version
  showing until the owner sets who can see it again. Making a build public also needs the
  `outfit_public_feed` flag. The board view carries `lastLockedVersion` (the newest snapshot, or
  `null`), which is what sharing would publish, so the app knows sharing is possible even while
  the board is open again as a draft.
- **The build's group chat is created the moment the first editor joins** and follows the editor
  list from then on; see `../chat/README.md` for why chat-side management of it is refused.
- **The owner is a member role, not a column.** A partial unique index
  (`outfit_members_one_owner_per_outfit_idx`) allows exactly one `OWNER` row per build. Handing
  over demotes the old owner before promoting the new one in the same transaction.
- **An item can only sit in its own build's slot.** `outfit_items` points at its slot with the
  pair (`outfit_slot_id`, `outfit_id`), which must match an `outfit_slots` row with the same pair.
- **The same product can't be on one board twice**, and a slot position holds one item
  (`outfit_items` unique keys). Whether a position fits inside its slot, blocked slots and the
  item caps are checked with the shared rules in `@outfiqe/utils` (`findPlacementRefusal`), which
  the web board uses too.
- **Products on a board can't be hard-deleted** (`ON DELETE RESTRICT`). Products are only ever
  soft-deleted today; the restriction keeps a board's history and later commission splits intact.
- **Other database rules**: version, positions and snapshot totals are never negative, the budget
  is never negative, the per-person limit is 1–3 when set, and a slot holds at least one item.
- **Publishing a build version as a look happens once per creator**, enforced by the unique key
  (`creator_id`, `source_outfit_id`, `source_outfit_version`) on `creator_looks`.
- **Snapshots save the contributors.** Build commission is split among everyone on the build when
  it was published, so each lock records the contributor ids alongside the prices.
- **Simultaneous edits are tested below the rate limiter.** Fifty parallel requests from one
  person would trip the 30-a-minute limit, so the concurrency test calls the service directly.
