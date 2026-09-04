# push

## Purpose

Keeps the list of browsers a user has allowed to receive push notifications, and sends a push to
those browsers whenever the user gets a notification.

## Structure

- `push.routes.ts` — three endpoints under `/api/push`, plus the per-user rate limit on the two
  that write.
- `push.controller.ts` — reads the signed-in user and the request body, hands off to the service.
- `push.service.ts` — turns the browser's subscription shape into database fields, and reads the
  VAPID public key from config.
- `push.repository.ts` — the upsert, the per-user cap, the delete, and the delivery bookkeeping
  (mark delivered, drop a gone subscription, count a failure and disable after too many).
- `push.schemas.ts` — validates the subscription the browser sends and the endpoint to unsubscribe.
- `push.constants.ts` — the per-user device cap, the rate-limit and field-length limits, the
  consumer group name, the message time-to-live, the failure count that disables a subscription,
  and the Nepal quiet-hours window.
- `push.events.ts` — subscribes to the `notification.created` stream with its own consumer group
  and hands each one to the dispatcher. Does nothing if VAPID keys are absent.
- `push.dispatch.service.ts` — for one notification: the quiet-hours and "app is open" and
  per-user mute checks, then the fan-out to that user's devices.
- `push.sender.ts` — the `web-push` call. Configures VAPID once, returns whether the send worked
  and whether the subscription is gone for good.
- `push.messages.ts` — turns a notification into a `{ title, body, url, tag }` the browser shows.
- `push.quiet-hours.ts` — whether a moment falls inside the Nepal night-time window.

## Funnel

**User-facing.** A person allows notifications in the browser and the app registers the
subscription here. From then on, when something happens that would give them an in-app
notification — a like, a follow, an order update — their phone also buzzes, unless they have the
app open, it is the middle of the night in Nepal, or they turned push off for that kind of thing.
Tapping the notification opens the relevant page.

**Technical.** Every notification row that gets created publishes `notification.created` on a Redis
stream. `push.events.ts` reads that stream under the `push-delivery` consumer group — separate
from the group that fans notifications out over web sockets, so the two ack independently and a
slow push send never holds up the in-app notification. For each event, `pushDispatchService`
checks quiet hours, `isUserOnline`, and the per-type push mute, then loads the user's active
subscriptions, renders the message once, and sends to every device at once. A send that comes
back "gone" (404/410) deletes that subscription; any other failure bumps a counter and, after
`FAILURES_BEFORE_DISABLING_SUBSCRIPTION` in a row, disables it; a success resets the counter.

## Non-obvious rationale

**Push reads the finished `notification.created` event, not the ~20 raw domain events.** By the
time a notification row exists it is already de-duplicated (grouped likes are one row) and the
recipient has already passed the in-app mute check. Re-deriving all that from `LOOK_LIKED`,
`USER_FOLLOWED` and the rest in a second place would double the surface every new notification
type has to touch. The trade is that push copy is built from the notification `type` and
`actorCount` rather than the richer per-event data.

**Its own consumer group, so it cannot slow the in-app path.** The socket fan-out and the push
fan-out read the same stream independently. If a push service is slow, the bell icon still updates
instantly.

**"App is open" suppresses the push entirely rather than delaying it.** A delayed-then-cancelled
push is more infrastructure (a scheduled job, a re-check) than it is worth here. Someone with the
app open sees the in-app notification; if they close the app before reading it, they miss the push
for that one event but the notification is still in their list. Revisit if this proves too quiet.

**Quiet hours are a fixed Nepal window, not per-user.** The audience is Nepal, which is a single
timezone, and we do not store a per-user timezone. A notification that lands at 3am is held back
from the phone but still shows in the app in the morning. There is no overnight digest yet.

**`endpoint` is unique across the whole table, not per user.** A browser's push endpoint is
globally unique. If one person signs out and someone else signs in on the same browser, the
upsert moves the row to the new user, so the first person's notifications can never reach the
second person's browser.

**Re-sending the same subscription is allowed and is the keepalive.** It bumps `lastSeenAt` and
clears `failureCount` / `disabledAt`, so a subscription the send path had disabled gets another
chance the next time the web app loads and re-registers it.

**A `DELETE` for an endpoint the caller does not own returns `204` without touching it**, so the
response cannot be used to discover that some other account has that endpoint registered.

**VAPID keys are optional config.** With any of `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` /
`VAPID_SUBJECT` missing, the delivery consumer never registers, `GET /public-key` returns `null`,
the web opt-in stays hidden, and stored subscriptions sit unused until the keys are set.
