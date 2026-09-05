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

## Testing this by hand

Nothing in CI can watch a real notification appear — Chromium's Notifications permission cannot
be granted through browser automation in this environment (see `apps/web/src/features/pwa/README.md`
for what was actually tried). Everything up to the browser's own permission check has automated
coverage; a real end-to-end check of "does a notification actually show up" has to be done by hand.

**One-time setup**

1. Generate a key pair: `pnpm --filter @outfiqe/api exec node -e "console.log(require('web-push').generateVAPIDKeys())"`.
2. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (a `mailto:` address or a
   `https://` URL) in the API's env. Restart the API — these are read once at startup.
3. Build the web app with `NEXT_PUBLIC_PWA_ENABLED=true` and run it against that API. `GET /api/push/public-key`
   should now return the public key instead of `null` — that confirms the config took.

**Turning push on**

4. Sign in on a real device or desktop browser (Chrome/Edge for the quickest loop; see the device
   notes below for Android and iPhone). Keep using the app normally until the "turn on
   notifications" bar appears, tap it, then accept the browser's own permission prompt.
5. Confirm the subscription landed: `SELECT * FROM push_subscriptions WHERE user_id = '<your id>'`.

**Triggering a real push**

Two ways, depending on what you're actually checking:

- **The whole pipeline, most realistic**: from a second account, like or follow the account that
  turned push on. This exercises the real domain event → notification → dispatch path.
- **Just the browser side, fastest**: skip the app entirely and send straight to the captured
  subscription with the `web-push` CLI:
  ```
  npx web-push send-notification \
    --endpoint="<endpoint from the row above>" \
    --key="<p256dh_key>" --auth="<auth_key>" \
    --payload='{"title":"Test","body":"Hello","url":"/profile","tag":"test"}' \
    --vapid-subject="<VAPID_SUBJECT>" --vapid-pubkey="<VAPID_PUBLIC_KEY>" --vapid-pvtkey="<VAPID_PRIVATE_KEY>"
  ```

**Two things that look like the feature is broken but are the feature working correctly**

- **Nothing arrives while the tab is open and connected.** That is the "app is open" suppression
  in `push.dispatch.service.ts` — close the tab (or the installed app) before triggering, or check
  the in-app bell instead.
- **Nothing arrives between 22:00 and 07:00 Nepal time.** That is the quiet-hours check. Either
  wait, or temporarily widen `QUIET_HOURS_START_HOUR`/`QUIET_HOURS_END_HOUR` in `push.constants.ts`
  for the test and revert it.

**What to actually check once something arrives**: the OS notification shows the right title and
body, clicking it opens the app at the right page (from its `url`), and the number on the app icon
updates — badging only shows once the app is installed, not in a plain browser tab.

**Device notes**

- **Android Chrome**: works in a plain browser tab, no install required.
- **iPhone**: only works once the app is added to the Home Screen (Share → Add to Home Screen,
  iOS 16.4+) — a Safari tab has no way to ask for the permission at all, and the opt-in bar knows
  this and shows an "install first" message instead of a dead button.
