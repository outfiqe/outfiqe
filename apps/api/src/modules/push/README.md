# push

## Purpose

Stores which browsers a user has allowed to receive push notifications, so a later change can send
one to each of them. This module only keeps the list up to date. It does not send anything yet.

## Structure

- `push.routes.ts` — three endpoints under `/api/push`, plus the per-user rate limit on the two
  that write.
- `push.controller.ts` — reads the signed-in user and the request body, hands off to the service.
- `push.service.ts` — turns the browser's subscription shape into database fields, and reads the
  VAPID public key from config.
- `push.repository.ts` — the upsert, the per-user cap, and the delete.
- `push.schemas.ts` — validates the subscription the browser sends (`endpoint` + `keys.p256dh` +
  `keys.auth`) and the endpoint sent to unsubscribe.
- `push.constants.ts` — the per-user device cap, the rate-limit window and ceiling, and the field
  length limits.

## Funnel

**User-facing.** A person allows notifications in the browser. The browser hands the app a
subscription — a URL plus two encryption keys. The app sends it here. From then on, that browser is
on the user's list. Turning notifications off, or the browser dropping the subscription, sends a
delete.

**Technical.** `POST /api/push/subscriptions` → `requireAuth` → rate limit → schema check →
`pushController.saveSubscription` → `pushService.saveSubscription` (flattens `keys` into columns) →
`pushRepository.save` (upsert on `endpoint`, then trims the user's oldest devices past the cap).
`DELETE /api/push/subscriptions` follows the same path to `pushRepository.removeForUser`, scoped to
the caller's own rows. `GET /api/push/public-key` is unauthenticated and returns the VAPID public
key the browser needs to subscribe, or `null`.

## Non-obvious rationale

**`endpoint` is unique across the whole table, not per user.** A browser's push endpoint is
globally unique. If one person subscribes, signs out, and someone else signs in on the same
browser, the endpoint is re-sent under the new user. The upsert moves the row to the new user, so
the first person's notifications can never be delivered to the second person's browser.

**Re-sending the same subscription is deliberately allowed and cheap.** It bumps `lastSeenAt` and
clears `failureCount` / `disabledAt`. The web app re-sends on every load, which doubles as a
keepalive and as recovery for a subscription the send path had marked as failing.

**Each user keeps at most `MAX_PUSH_SUBSCRIPTIONS_PER_USER` devices.** On exceeding it, the oldest
by `lastSeenAt` are dropped rather than the request being rejected — a real person with many
devices should not have to manage this, and a script filling the table is capped either way.

**A `DELETE` for an endpoint the caller does not own returns `204`, not `404`.** The caller has
said "this device should not get my notifications", and after the call it does not. Reporting
whether a row existed would leak that some other account has that endpoint registered.

**VAPID keys are optional config.** The API boots without them. `GET /public-key` then returns
`null`, the web app hides the opt-in, and stored subscriptions sit harmlessly unused until the keys
are set.
