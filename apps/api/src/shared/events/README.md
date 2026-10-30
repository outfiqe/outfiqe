# events

## Purpose

Domain events (likes, follows, new looks, signups and more) travel between modules over Redis Streams. This folder publishes them and delivers them to each consumer group.

## Structure

- `event-bus.ts` — `DomainEvents` and `eventBus.publish`.
- `event-bus.consumer.ts` — `subscribeToDomainEvent` and `stopDomainEventConsumers`, the delivery loop for each subscription.
- `event-bus.constants.ts` — batch size, block time, idle time before a claim, and the delivery attempt limit.
- `event-bus.types.ts` — event payload types.
- `event-bus.utils.ts` — payload parsing, dead-letter publishing and error checks.

## Funnel

**User-facing:** a person likes a look or places an order, and the follow-on work (a notification, XP, a recount) happens shortly after without slowing their request.

**Technical:** a service calls `eventBus.publish` → the event lands on its Redis stream → each subscribed group reads it in `runConsumerLoop` → `processEntry` runs the handler and acknowledges it. A failed entry stays pending, `claimStuckEntries` picks it up again, and it moves to the dead-letter stream once it passes `MAX_DELIVERY_ATTEMPTS`.

## Non-obvious rationale

**A stream entry can have null fields.** The stream is trimmed with `MAXLEN`, so an entry can be removed while it is still pending for a group. There is nothing left to retry or dead-letter, so `processEntry` logs it and acknowledges it to clear the pending list.

**Stopping a consumer disconnects its Redis client.** `readNewEntries` can block inside `XREADGROUP` for up to `CONSUMER_BLOCK_MS`. Disconnecting rejects that call straight away, so shutdown does not wait for it.
