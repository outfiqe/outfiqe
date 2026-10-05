# Outfit Build: how it works

This explains Outfit Build as it is built: the design, what it reuses, how to run its tests, and
how to launch it and switch it off. The step-by-step plan it was built from is
`docs/PLAN-OUTFIT-BUILD.md`. Each module's own `README.md` has the detail.

## What it is

People put one outfit together on a shared board, alone or with up to four others. Everyone taps
**I'm happy**, the owner locks it, and the owner decides who sees it: the people on it, a chosen
few, or everyone. A locked build can be bought as a full set or item by item, posted as a Creator
Look, sent to a creator as a paid offer, and shown in the Builds tab in Explore. Contributors share
its commission equally.

## Where the code is

| Area                                                            | API (`apps/api/src`)                                 | Web (`apps/web/src`)             | Admin (`apps/admin/src`)                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| The board, people, locking, sharing, photos, publishing, buying | `modules/outfits`                                    | `features/outfit-build`          |                                                                               |
| Slot types                                                      | `modules/outfit-slot-types`                          |                                  | `features/outfit-slot-types`                                                  |
| Paid offers                                                     | `modules/outfit-offers`                              | `features/outfit-offers`         | `features/outfit-offers`                                                      |
| Build commission                                                | `modules/commissions`, `modules/orders`              | `features/creator-dashboard`     | `features/commissions`                                                        |
| Group chat for each build                                       | `modules/chat`                                       | `features/messaging`             |                                                                               |
| Saved sizes                                                     | `modules/saved-sizes`                                | `features/saved-sizes`           |                                                                               |
| Switches and settings                                           | `modules/feature-flags`, `modules/platform-settings` | `shared/hooks/useFeatureFlag.ts` | `features/platform-switches`, `features/platform-settings`                    |
| Staff tools                                                     | `modules/outfit-admin`, `modules/platform-jobs`      |                                  | `features/outfit-builds`, `features/platform-jobs`, `features/platform-audit` |
| Announcing changes                                              | `shared/outbox`                                      |                                  |                                                                               |

## The design in short

**Every board change is one short transaction.** The browser sends the version it last saw
(`X-Outfit-Version`) and an `Idempotency-Key`. The server checks the person's role, claims the next version
with a conditional update, checks the rules (slot fits, item limits, photo limits, status), applies
the change, and writes a history row and an outbox row, all in that one transaction
(`runOutfitWrite`, `modules/outfits/outfit.write.ts`). A stale version gets `409` with the current
version; a missing header gets `428`. Two people editing at once can't overwrite each other, and
nothing is locked while someone is deciding.

**Announcements can't be lost.** The outbox row is saved with the change, then a relay hands it to
a BullMQ queue (`realtime`, `inventory`, `notify`, `analytics`). Workers send the socket update,
the notification, the stock alert. If Redis or sockets are down, the change still saves and the
announcement goes out when they recover. Nothing is sent from inside a transaction.

**Browsers catch up by version.** Every socket update carries the build's version. A browser
ignores old versions, applies the next one, and refetches if it notices a gap, using
`GET /api/outfits/:id/events?sinceVersion=` after a dropped connection.

**The database is the guard.** Stock can't go below zero (a CHECK constraint, with a ledger that
records every change and a nightly check that they agree). One owner per build, one open offer per
creator per build, one photo per cover position, one look per creator per build version: all are
database constraints, not checks in code alone. Redis is never used to protect data.

**The server decides prices, limits and access.** Prices and totals are worked out on the server.
Every limit is a setting with a default in code (`modules/platform-settings`), checked inside the
transaction. A person with no access to a build gets `404`, so they can't tell it exists.

**Money.** Buying from a build attributes each item to the build version it came from; at
checkout that competes with tag and link clicks, and a build sale pays Build commission split
equally among the build's contributors (a brand's share goes to its payouts). Offers are paid by
the brand when sent and held until the creator's look has stayed up for the hold period, then
released to the creator's earnings; declined, expired or removed offers are refunded.

## What it reuses

Creator Looks (publishing a build calls the same look code), the commission tier table (with a
scope column for Build or Creator Look), attribution (one more source), chat and sockets (group
chats, build rooms), the image pipeline and its upload limits (build photos), idempotency, the
Redis rate limiter, notifications and push, the platform audit log, content reports, and custom
admin roles. New pieces: the outbox, global feature switches and settings, group chats, saved
sizes, the stock ledger, English and Nepali text, shared content checks, and returns after
delivery.

## Switches

| Switch               | What it turns on                                               |
| -------------------- | -------------------------------------------------------------- |
| `outfit_builder`     | The whole feature: routes, socket joins, jobs, the web screens |
| `outfit_public_feed` | Public builds and the Explore Builds tab                       |
| `outfit_photos`      | Build photos                                                   |
| `outfit_try_on`      | Try-on photos (needs `outfit_photos` too)                      |

Each switch is off, on for a list of people and brands, or on for everyone. They are changed in
admin under **Feature switches**, take effect within seconds, and every change is audited.

## Launching it

1. **Built and held back.** Everything merged and tested, every switch off.
2. **Team only.** Turn `outfit_builder` on for our own accounts through the allow list. Test
   starting a build alone and from a chat, invites, private, shared and public builds, the pop-up,
   buying a full set and picked items, posting as a look, an offer end to end, photos.
3. **Beta.** Add about five brands and the creators they build with to the allow lists, including
   `outfit_public_feed`. Collect feedback every week.
4. **Everyone.** Switch each one to everyone once it has been stable for two weeks, and only after
   the 500-person load test has passed on servers sized like production.

**The safety switch.** Turning `outfit_builder` off stops every build route, socket join and job
at once; the web app hides the screens. Chat, Creator Looks, checkout and existing orders keep
working, and nothing is deleted, so turning it back on restores every build as it was. Photos and
try-on photos can be switched off on their own.

**Watching it.** Admin **Jobs & health** shows how far behind the outbox is, stuck events and each
queue, with retries. Admin **Outfit builds** has the weekly metrics. Failed jobs, the relay giving
up on an event, and stock that doesn't match the ledger are reported to Sentry.

## Running the tests

From the repository root, with the test database and Redis running
(`docker compose --profile test up -d postgres-test redis-test`):

```bash
pnpm test
```

While working on one area, run just that package's tests, for example:

```bash
pnpm --filter @outfiqe/api exec vitest run src/modules/outfits
pnpm --filter @outfiqe/web exec vitest run src/features/outfit-build
```

Concurrency and stock tests run against the real database, never mocks. The ones that matter
most:

| Test                                                                                      | File                                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 50 people change one board at once: one wins each version                                 | `modules/outfits/outfit.board.integration.test.ts`                                         |
| Photo adds at the same moment never exceed the limits                                     | `modules/outfits/outfit.photos.integration.test.ts`                                        |
| Slot rules, locking rules, `428` without `X-Outfit-Version`, idempotent retries           | `modules/outfits/outfit.board.integration.test.ts`, `outfit.lifecycle.integration.test.ts` |
| Publishing the same version twice makes one look                                          | `modules/outfits/outfit.publish.integration.test.ts`                                       |
| Build and look orders pay the right rate; Build commission splits equally                 | `modules/outfits/outfit.cart.integration.test.ts`, `modules/orders`                        |
| Offers: pay, accept, post, hold, release, refund, expiry                                  | `modules/outfit-offers/outfit-offer.integration.test.ts`                                   |
| Every admin route refuses a role without permission                                       | `modules/platform-access/platform-permissions.integration.test.ts`                         |
| Stock never goes below zero and matches the ledger                                        | `modules/products/product.inventory-ledger.integration.test.ts`                            |
| The safety switch closes every build route and job; chat and Creator Looks keep working   | `modules/outfits/outfit.kill-switch.integration.test.ts`                                   |
| Each launch stage (held back, team only, beta, everyone) lets in exactly the right people | `modules/outfits/outfit.launch-stages.integration.test.ts`                                 |
| A sixth checkout in one minute is refused                                                 | `modules/orders/order.checkout-limits.integration.test.ts`                                 |

The load test (500 people using boards at once) is in `apps/api/load/outfit-boards.k6.js`; how to
run it is in `apps/api/load/README.md`. Run the full 500 only against servers sized like
production. On a laptop or the small internal test server, run a smaller version (the README says
which size where), because there it measures that machine's limits, not the code.
