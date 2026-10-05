# Building Outfit Build

## What we are building

Outfit Build lets people put one complete outfit together, on their own or with others, and
turn it into a shoppable post. A build can be started from a chat or from a new **My Builds**
hub with no chat at all. Up to five people edit the same board live, everyone taps **I'm happy**,
and the owner locks it. The owner then decides who can see it: just the people building it,
a few chosen people, or everyone.

When this is finished, people will be able to:

- Start a build alone or inside a chat, invite others, and plan it together in the build's own
  group chat.
- Fill slots (Top, Bottom, Full Outfit, Footwear, Accessory, Extra) with products from any
  brand, and see live prices, a budget bar, and whether each item is in their size.
- Lock a build, share it with chosen people, or publish it to a new **Builds** tab in Explore.
- Comment on, like, save, and report public builds, the same way as any other post.
- Buy the whole outfit in one tap, or pick only the items they want.
- As a creator, publish a locked build as their own Creator Look.
- As a brand, send a locked build to a creator as a paid offer: "Post this outfit for Rs 5,000".

Contributors to a build share its commission equally. Admins control the slot types, the
limits, the commission rate, and when the feature is switched on.

The whole feature ships switched off. We turn it on when we choose to, as its own launch moment,
not when the code happens to be ready.

This plan brings together three documents: the Outfit Build product requirements (v2), the
Outfit Builder architecture, and the Outfit Builder build prompt. Where they disagree, the
product requirements decide **what** the feature does, and the architecture and build prompt
decide **how** it is built. Every rule in `CLAUDE.md` still applies on top of both.

---

## The main choices we made

| Topic                        | What we chose                                                                     | Why                                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API style                    | REST, the same as every other module                                              | The architecture document mentions GraphQL, but the whole app is REST with react-query. A second API stack would double the surface for no gain.                                                            |
| Money                        | Whole rupees stored as integers                                                   | The app already stores every price, order, and commission this way. Using paisa only in builds would mix units where builds meet the cart.                                                                  |
| Checkout                     | Unchanged                                                                         | The product requirements say checkout works as it does today. Stock is still only taken when a COD order is placed or a wallet payment is confirmed. We never hold stock while a wallet payment is pending. |
| Board edits at the same time | A version number on the build, checked on every change                            | Two people editing at once can never silently overwrite each other. The loser sees "Board updated by Sita, showing latest". No lock is held while someone is thinking.                                      |
| Announcing changes           | A transactional outbox, relayed into BullMQ                                       | The change and the "please announce this" record are saved in the same transaction, so a Redis or socket failure can delay a live update but never lose one.                                                |
| Board items                  | Products, not sizes                                                               | Each buyer picks their own size. The board shows whether each item is available in the viewer's size.                                                                                                       |
| Slots                        | Admin-managed slot types linked to **product types**                              | In our data, `Category` means style (formal, streetwear). `ProductType` is what says a product is a top or a shoe.                                                                                          |
| Build commission             | The existing commission tier table, with a scope column for Creator Look or Build | One commission system with two rates, rather than a second system. Commission is already worked out per item, so builds with several brands settle cleanly.                                                 |
| Sharing commission           | Split equally among everyone on the build when it was published                   | Brand shares go to the brand's payout balance. A person's share goes to their earnings, even if they are not an approved creator. Buying from your own build earns you nothing on that sale.                |
| Offers                       | The brand pays when sending the offer; we hold the money until the creator posts  | Neither side has to trust the other. Deadlines and a holding period stop a creator from posting and deleting straight away.                                                                                 |
| Pathao                       | No integration                                                                    | Pathao stays a carrier name, as today. Parcels that come back are handled by a new admin "Returned / returned to origin" action.                                                                            |
| Feature switches             | A new global feature-flag system with user and brand allow lists                  | The existing platform feature flags only work per CRM tenant. Creators are not tenants.                                                                                                                     |
| Photos                       | The existing image pipeline and the existing storage driver (local disk)          | No new object storage driver. Photos go through the same upload and storage path as Creator Look photos, so a later move to object storage covers them too.                                                 |

---

## What already exists and what is new

| Piece                    | Today                                                                                              | What we do                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Creator Looks            | Built, with product tagging and moderation                                                         | Publishing a build calls the existing look creation code. The look's tagged-product limit (6 today) follows the board's item cap setting, so a 7-item build can always be published. |
| Commission               | Price-tiered, one commission per order item, saved at order time                                   | Add a scope column (Creator Look or Build), and allow more than one commission row per order item so a build's commission can be split.                                              |
| Attribution              | Tag clicks and creator links, last click wins within 7 days                                        | Add "shopped from a build" as one more source.                                                                                                                                       |
| Chat                     | One-to-one messages with sockets                                                                   | Add group chats, a build card message type, and system messages.                                                                                                                     |
| Sockets                  | Socket.IO with the Redis adapter                                                                   | Add build rooms with a membership check before joining.                                                                                                                              |
| Jobs                     | Interval and boundary schedulers in `apps/api/src/jobs/`, BullMQ in the image pipeline, bull-board | Reuse. New jobs and queues are wired in the same places.                                                                                                                             |
| Image pipeline           | Checks the file type from its content, removes location data, makes several sizes                  | Reuse, with its existing upload limits. Add the build photo wiring.                                                                                                                  |
| Idempotency              | `RequestIdempotency`, used by checkout and payments                                                | Extend it: detect a reused key with a different request, free the key when a request fails, clean up after 24 hours.                                                                 |
| Stock                    | Race-safe conditional updates                                                                      | Add a stock ledger that records every change, and a database rule that stops stock going below zero.                                                                                 |
| Rate limits              | Redis-backed middleware                                                                            | Reuse with new limits.                                                                                                                                                               |
| Notifications and push   | Built, with grouped notifications                                                                  | Reuse with new notification types.                                                                                                                                                   |
| Audit log                | `PlatformAuditLog`                                                                                 | Reuse, storing before and after values.                                                                                                                                              |
| Reports and moderation   | `content-reports`, for looks and comments                                                          | Add builds, build photos, and build comments.                                                                                                                                        |
| Admin roles              | Custom roles built from permission keys                                                            | Add new permission keys. Support, Moderator, Finance, and Super admin become roles built from them.                                                                                  |
| Global settings          | None                                                                                               | New: admin-editable settings with defaults in code.                                                                                                                                  |
| Global feature flags     | None                                                                                               | New.                                                                                                                                                                                 |
| Outbox                   | None                                                                                               | New.                                                                                                                                                                                 |
| Group chats              | None                                                                                               | New.                                                                                                                                                                                 |
| Saved sizes              | None                                                                                               | New: private "my sizes" per product type.                                                                                                                                            |
| English and Nepali       | No translation layer                                                                               | New, for every Outfit Build screen.                                                                                                                                                  |
| Automatic content checks | None                                                                                               | New, shared by builds, looks, and comments.                                                                                                                                          |
| Returns after delivery   | Not supported                                                                                      | New admin action.                                                                                                                                                                    |

---

## Rules every step follows

**How we work.** Each step below is one pull request. Before coding a step we write a short plan
(files, migrations, what is reused, what is new, risks) and wait for approval. After each step we
report what was reused, what was built, files changed, migrations, tests, anything that differs
from this plan, and open questions.

**Writing data.**

- Postgres is the only source of truth. Every change is a REST request that runs one short
  transaction.
- Every request that changes a board sends the version it last saw in an `If-Match` header. No
  header returns `428`. A stale version returns `409 OUTFIT_VERSION_CONFLICT` with the current
  version. The new version comes back in the response and as an `ETag`.
- Every write needs an `Idempotency-Key`. Sending the same request twice has one effect and
  returns the same answer.
- Changing the editor list locks the build row first, so the five-editor limit cannot be raced.
- Version conflicts are never retried by the server. Only short-lived database errors are retried,
  at most three times.
- Redis locks never protect data. Only database constraints and conditional updates do.

**Announcing changes.**

- Every build change writes a history row and an outbox row in the same transaction.
- Nothing sends a socket message or notification from inside a transaction.
- Sockets only send data from the server to people's browsers. Browsers can only join or leave a
  room and ask to catch up (`outfit:sync`).
- Every live update carries the build's version. The browser ignores anything old, applies the next
  version, and refetches if it notices a gap.

**Prices, limits, and permissions.**

- Prices and totals are always worked out on the server. Anything the browser sends is ignored.
- Every limit (items, slots, editors, photos, items per person) is checked inside the transaction,
  not just in the interface.
- Every route and socket join checks that the person is a member with the right role. A person
  with no access gets `404`, so they cannot even confirm the build exists.
- All limits and starting values live in admin settings with defaults in code, never hard-coded
  inside logic.
- The feature flags are checked in routes, socket joins, and background jobs.

**Code and data.**

- Migrations only add. Large tables get indexes built without locking them. CHECK constraints and
  partial indexes are written in raw SQL.
- Everything in `CLAUDE.md` applies: no code comments, a README for every module and feature,
  clear names, no `any`, design-system components first, loading, empty and error states on every
  list, accessibility, and tests shipped with the code.

---

## The work, step by step

Until the launch step at the end, everything stays switched off behind the `outfit_builder` flag.
That is what makes it safe to merge each step into `dev` as it is finished.

### Checking what exists — done

We checked every building block the feature needs against the code, matched the names in the
architecture document to our real models, and confirmed how commission and stock work today.
Commission is worked out per item and saved at order time. Stock updates are already race-safe.
The findings are the "What already exists" table above.

### Shared reliability pieces

- **Idempotency.** Extend `RequestIdempotency` with a request hash and a processing or completed
  status. A reused key with a different request returns `422`. A request still running returns
  `409`. A request that fails frees its key, which also fixes a bug today where a failed checkout
  could never be retried with the same key. Keys are deleted after 24 hours.
- **Outbox.** A new `OutboxEvent` table and a relay job that runs every half second. It picks up
  unsent rows with `FOR UPDATE SKIP LOCKED`, so two relays never send the same row, and adds each
  one to BullMQ using the row's id as the job id, so duplicates are ignored.
- **Separate queues.** Four BullMQ queues: realtime, inventory, notify, and analytics. A stuck
  notification queue can never slow down live board updates. Failed jobs retry with backoff, are
  kept after five attempts, and are reported to Sentry.
- **Retries and timeouts.** A `withRetry` helper for short-lived database errors. Transactions time
  out after 5 seconds, outside HTTP calls after 8, socket acknowledgements after 3.
- **Settings and feature flags.** New admin-editable settings with defaults in code, cached for a
  minute, and a new global feature-flag system with user and brand allow lists. Flags start off:
  `outfit_builder`, `outfit_photos`, `outfit_try_on`, and `outfit_public_feed`. Every admin change
  is written to the audit log with the old and new values.
- **Stock ledger.** Every stock change writes a ledger row in the same transaction, and a database
  rule stops stock going below zero. Existing sizes get an opening balance, and a nightly job
  checks that stock still matches the ledger. Editing a product's sizes changes them in place
  instead of deleting and recreating them, so the ledger history and past orders stay intact.

### Group chats

Add group conversations to chat: create a group, add people, leave, and send messages, with the
same delivery and read receipts one-to-one chat already has. Add a message type for build cards
and server-generated system messages. This is needed before builds, because a build started in a
group chat lets the owner pick editors from its members, and every build gets its own group chat.

### The build data model and slot types

- Create the build tables: builds, members (owner, editor, and viewer roles), items, photos, the
  change history, and the locked-version snapshots.
- Create admin-managed slot types linked to product types, and an admin page for them. Each build
  copies its slots when it is created, so later admin changes never affect builds in progress.
- Add the missing product types (footwear, accessories, saree, kurta set, lehenga) and their sizes
  to the shared defaults.
- Put the slot rules in one shared file used by the API and the web app. A Full Outfit blocks Top
  and Bottom while it is filled.
- Add the link from Creator Looks back to the build they came from, and the scope column on
  commission tiers.

### The board's API

- Create a build, add, swap and remove items, reorder extras, set the budget and the items-per-person
  limit, tap "I'm happy", lock, unlock, archive, manage members, hand over ownership, and choose who
  can see it.
- Any change clears everyone's "I'm happy". Locking needs the minimum number of items, nothing
  sold out, everyone happy, and the owner. Locking saves the prices at that moment.
- Unlocking starts a new version. Anything already shared or public stays as it was until the
  owner updates it.
- Who can see a build can change without unlocking it.

### Live updates

Build rooms that only members can join, live `outfit:updated` events, catching up after a
dropped connection through `outfit:sync` or `GET /outfits/:id/events?sinceVersion=`, and system
messages in the build's chat. Board activity notifications are grouped every 30 seconds.

### The board in the web app

- My Builds and "Shared with me".
- The build card inside chats, the slot grid, and a product picker that reuses product search,
  filtered to the slot's product types, showing stock and sizes.
- Tap a slot to fill it on a phone, or drag products in on a computer, with keyboard support.
- Changes appear instantly and roll back if the server rejects them.
- Buttons appear based on each person's role.
- The budget bar, "who added this" photos, "Reconnecting…", and the conflict message.
- English and Nepali text, prices in lakh format, and Nepal time.

### Stock alerts and sizes

- When a product sells out, a background job finds draft boards that use it and marks the slot as
  sold out, suggests an in-stock replacement, notifies the owner and editors, and blocks locking
  until it is swapped. Bursts of stock changes are grouped per product so a flash sale does not
  flood anyone.
- The build card shows "Fully available" or "Some items unavailable".
- Add private "my sizes" per product type in account settings. When none is saved, we use the
  size the person last bought in that product type and offer to save it.

### Publishing a build as a Creator Look

A creator on a locked build can publish its items as their own Creator Look, through the existing
look creation code, with the cover photos and an editable caption. Publishing the same version twice
returns the same look. When the owner changes the build, creators who published get a
"New version available" message and can republish. A look made this way earns the Creator Look
commission rate.

### Explore, the pop-up, and social features

- A Builds tab in Explore, next to For You and Following, with filters for category, price, and
  whether everything is in stock.
- Tapping a card opens it in a pop-up, like any other post. Public builds also get their own page
  for search engines and shared links.
- Comments with replies, likes, saves, comment counts, every contributor's name, and Builds tabs on
  brand and creator profiles.
- Reports go into the existing moderation queue. A shared build can only be commented on by the
  people it was shared with.
- An automatic content check runs before any build goes public. The same check also covers looks
  and comments, so all public content is held to the same bar.

### Buying from a build and Build commission

- **Buy the full set** adds every item that is in stock, in the chosen sizes, and names anything
  that was left out. **Pick your own items** works like any cart.
- Buying from a build is recorded as its own attribution source.
- Admin sets a Build commission range, separate from Creator Look commission, with an overlap
  warning, a "test a price" box, and a change history. The same safeguards are added for Creator
  Look commission.
- Build commission is split equally among the build's contributors, as described in the choices
  table.
- Add the admin "Returned / returned to origin" action for shipped or delivered orders. It puts the
  stock back through the ledger, voids any commission not yet paid, and is written to the audit log.

### Offers

- A brand on a locked build can send it to a creator on the build as an offer with a price.
- The brand pays through eSewa or Khalti when sending. We hold the money.
- The creator accepts or declines before an acceptance deadline, then must post a Creator Look from
  the build before a posting deadline.
- The money is released to the creator's earnings once the look has stayed up for a holding period.
- The brand is refunded automatically if the offer is declined, a deadline passes, or the look is
  deleted early. Khalti refunds are automatic. eSewa has no refund API, so those are flagged for a
  manual refund in admin, the same as orders today.
- Admin can release or refund by hand when there is a dispute. Every action is audited.
- There is no platform fee on offers unless we decide to add one later.

### Photos

- Use the existing storage driver (local disk today) and the existing image pipeline. No new
  object storage driver is built in this version.
- Upload through the existing flow and image pipeline, with that flow's own limits (5 MB each,
  JPEG, PNG or WebP, cropped in the browser first), location data removed and the file type
  checked from its content. Decided on 2026-10-03: use the existing upload rules rather than a
  separate 10 MB limit for build photos.
- Five photos per person and fifteen per board. The owner picks up to six cover photos. Without
  a cover, the card shows a grid of the first three items with a "+N items" tag.
- A separate try-on gallery, so people can tell a real photo from a product shot.
- Photos can be reported and removed. Uploads that were never confirmed are cleaned up after a day.

### Admin

- Screens for feature flags, settings, builds (items, members, versions, history, the snapshot,
  and looks published from it, with unlock and archive), moderation, and the audit log.
- **Jobs and health** for super admins: the existing bull-board, how far behind the outbox is,
  and a way to retry failed events.
- The metrics we use to judge the feature: builds created each week (on their own and from a chat),
  how many get locked, how many go shared or public, comments, likes and saves, full-set versus
  picked-item orders, and commission earned at each rate.
- Roles: Support can view, Moderator can also remove content and archive, Finance can also change
  commission for both Builds and Creator Looks, and Super admin can do everything, including flags,
  settings, and jobs. Every rule is enforced by the API.

### Hardening and launch

- Rate limits per person: 30 board edits a minute, 10 photo uploads a minute, 5 checkouts a minute,
  and 60 socket messages a minute.
- Sentry alerts for failed jobs, a growing outbox, and stock that does not match the ledger.
- Check the slow paths with `EXPLAIN ANALYZE`: the permission check, loading a board, the stock
  watcher, catching up after a reconnect, and the publish lookup.
- Run the full test list below, including a load test.
- Rehearse each launch stage and the safety switch, then write a short
  `docs/chat-commerce/outfit-builder.md` explaining the design, what was reused, and how to run
  the tests.

---

## Tests that must pass

Concurrency and stock tests run against a real database, never mocks.

| Test                                                                        | What must happen                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 50 people change one board at the same moment                               | Exactly one change wins each version. The rest get a conflict. Nothing is lost.       |
| 100 buyers race for 10 units                                                | Exactly 10 succeed. Stock never goes below zero and matches the ledger.               |
| Photo uploads beyond the limit, at the same time                            | Never more than 5 per person or 15 per board.                                         |
| An 8th item, a second Top, the wrong product type, a Full Outfit with a Top | All refused by the API.                                                               |
| Locking by an editor, or while someone has not tapped "I'm happy"           | Refused.                                                                              |
| The same request sent 5 times with one idempotency key                      | One effect, the same answer every time.                                               |
| A board change with no `If-Match` header                                    | `428`.                                                                                |
| The same build version published twice by one creator                       | One Creator Look.                                                                     |
| Publishing by a brand, or from an unlocked build                            | Refused.                                                                              |
| An order through a build and through a published look                       | Each uses the right commission rate. Build commission splits equally.                 |
| A worker or Redis killed in the middle of a change                          | No data lost. The outbox catches up and boards resync.                                |
| Two carts with the same items locked in opposite order                      | No deadlock, or a clean retry.                                                        |
| A non-member tries every route and socket join                              | All refused.                                                                          |
| A tampered price in a request                                               | Ignored.                                                                              |
| The flag switched off                                                       | Routes, sockets, and jobs all refuse. Chat and Creator Looks keep working.            |
| An admin role without permission calls an admin route                       | `403`.                                                                                |
| 500 people using boards at once                                             | Most changes finish in under 200 ms. The database connection pool is never exhausted. |

---

## Launching it

1. **Built and held back.** Everything merged, tested, and switched off.
2. **Team only.** Turned on for our own accounts through the allow list. We test starting a build
   alone, invites, private, shared and public builds, the pop-up, buying a full set, and picking
   items.
3. **Beta.** Turned on for about five brands and the creators they build with. The Builds tab in
   Explore is visible to them first. We collect feedback every week.
4. **Everyone.** Turned on for all once it has been stable for two weeks.

Photos and try-on photos have their own switches, so they can be turned on separately.
Admin can turn the whole feature off at any time. Chat and existing Creator Looks keep working when
it is off.

---

## Not in this version

These are left out on purpose, as the product requirements say:

- A discount for buying the full set, and outfit templates or suggestions.
- Video on build cards or in the try-on gallery.
- Boards with more than five editors.

Still open, and not built unless we decide to:

- Letting brands feature a public build on their own store page.
