# outbox

## Purpose

A transactional outbox: the way a database change announces itself (a socket update, a
notification, a stock alert) without ever losing that announcement. A write saves its business
rows and an `OutboxEvent` row in the same transaction. A relay job then hands each event to a
BullMQ queue, and workers on that queue do the actual announcing.

The result: if Redis, BullMQ or the sockets are down, the change still saves, and its announcement
goes out once they recover. If the transaction fails, the announcement disappears with it. The
change and its announcement always succeed or fail together.

## Structure

- `outbox.constants.ts` — the topics (`OUTBOX_TOPIC`), the four queue names, which queue each
  topic goes to, which process role runs which queue's worker, and every timing and retry number.
- `outbox.types.ts` — `OutboxTopic`, `OutboxQueueName`, the event input, the job data a handler
  receives, and the relay's summary.
- `outbox.utils.ts` — topic guard, topic-to-queue lookup, error trimming, and
  `toQueueConnectionOptions`, which turns `REDIS_URL` into BullMQ connection options.
- `outbox.service.ts` — `enqueueOutboxEvent(tx, event)`, the only way to add an event;
  `runOutboxRelay`, the relay job; `runOutboxRetentionSweep`, the cleanup job.
- `outbox.queues.ts` — the BullMQ queues (opened lazily, closed on shutdown) and `addOutboxJob`.
- `outbox.handlers.ts` — `registerOutboxHandler(topic, handler)`: a module registers the code
  that runs for its topic.
- `outbox.workers.ts` — `startOutboxWorkers(queueNames)` / `stopOutboxWorkers`, one BullMQ worker
  per queue.

## Funnel

**User-facing:** nothing directly. Someone changes something (buys the last unit of a size, say),
and the people who should hear about it do, even if part of the system was having a bad moment
when it happened.

**Technical:** service transaction → `enqueueOutboxEvent(tx, …)` → `outbox_events` row → the
`outbox-relay` job (every 500 ms, `src/jobs/scheduled-jobs.ts`) → `addOutboxJob` → the topic's
BullMQ queue → that queue's worker → the handler registered for the topic.

## Non-obvious rationale

**Why not just publish to Redis Streams after commit, like the older domain events?** Those
publish after the transaction commits. A crash between the commit and the publish, or Redis being
down at that moment, silently loses the event. The outbox row is written inside the transaction,
so it can only be lost if the change itself is lost. The existing Redis Streams events are left
as they are; new features use the outbox.

**Two relays can run at once without sending anything twice.** The relay claims rows with
`FOR UPDATE SKIP LOCKED`, so a second relay skips whatever the first is holding. Each BullMQ job
uses the outbox row's id as its `jobId`, and BullMQ ignores a job whose id it already has. So even
if a relay adds a job and then dies before marking the row published, the retry adds nothing new.
Handlers must still be safe to run twice, because BullMQ delivers at least once.

**The relay's transaction is held while it talks to Redis.** That is the price of the row lock
above. It is kept short: at most 100 rows per run and a 5-second transaction timeout. Producer
connections don't queue commands while Redis is down (`enableOfflineQueue: false`), so the relay
fails fast instead of stalling.

**Failures are recorded, not retried forever.** A row that can't be published gets its `attempts`
counted and its error saved in `lastError`, and is reported to Sentry. After 10 attempts the relay
stops picking it up; it stays in the table for the admin jobs screen. A BullMQ job that fails
5 times, with exponential backoff between tries, stays in the queue's failed set and is reported
to Sentry. Bull Board (`/internal/queues`, co-founders only) shows every outbox queue.

**Four queues, so one slow kind of work can't block another.** `realtime` (socket updates) runs
in the `api` process role, because it needs the socket server. `inventory`, `notify` and
`analytics` run in the `worker` role. A backed-up notification queue can't delay a live board
update. See `src/processes/README.md`.

**Published rows are kept for 7 days, then deleted in batches** by `outbox-retention-sweep`. The
partial index `outbox_events_unpublished_created_at_idx` covers only unpublished rows, so the
relay's query stays fast however many published rows are waiting to be cleaned up.

**Topics in use:**

- `stock.changed` (inventory queue), written by every stock change in `../../modules/products`
  (`recordStockChanges`), carrying the changed size ids.
  `../../modules/outfits/outfit.stock.ts` flags draft-build items that just sold out or came back.
- `outfit.items-sold-out` (notify queue) and `outfit.availability-changed` (realtime queue),
  written by that handler: the first becomes a notification to the build's owner and editors, the
  second an `outfit:availability-changed` socket event so open boards refetch.
- `outfit.changed` (realtime queue), written by every change to an Outfit Build
  (`../../modules/outfits`), carrying the build id, its new version, the kind of change and who
  made it. `../../modules/outfits/outfit.realtime.ts` turns it into an `outfit:updated` socket
  event for everyone watching the board.
- `outfit.activity` (notify queue), written alongside every `outfit.changed` with the same
  payload. `../../modules/outfits/outfit.notifications.ts` turns it into notifications, so a slow
  notification can never delay a live board update.
- `chat.message-created` and `chat.member-removed` (realtime queue), written when a build's group
  chat changes inside a build transaction (`../../modules/chat/build-chat.service.ts`). Their
  handlers (`../../modules/chat/chat.outbox.ts`, registered by the realtime consumers) republish
  the existing `MESSAGE_CREATED` / `CONVERSATION_MEMBER_REMOVED` domain events, so chat's own
  socket delivery and offline notifications do the rest.

A job for a topic with no handler completes with a warning and does nothing.
