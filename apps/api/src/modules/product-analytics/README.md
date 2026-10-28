# product-analytics

## Purpose

Sends the events the business depends on to PostHog from the server, so they're never lost to an
ad blocker or a closed tab: sign-ups, placed orders, deliveries, cancellations and returns,
refunds, creator commissions, new looks, follows, creator-link clicks and support tickets. Event
names and properties come from the shared catalog in `@outfiqe/utils` (`ANALYTICS_EVENTS`), the
same one the web app uses. Why we measure each one is in `docs/PLAN-ANALYTICS-POSTHOG.md`.

## Structure

- `product-analytics.events.ts`: `registerProductAnalyticsEventConsumers`. It turns domain
  events into PostHog events, grouped by area (account, commerce, creator, social, support).
- `product-analytics.service.ts`: `productAnalyticsService`, the root object other modules
  import.
  - `captureServerEvent` sends one catalog event.
  - `captureCreatorLinkClick` is used by `creator-links`.
  - `flushPendingEvents` is a shutdown step in every process role.
- `product-analytics.posthog.ts`: the only code that talks to `posthog-node`.
  - It opens one client lazily.
  - It does nothing when `POSTHOG_PROJECT_TOKEN` is unset, which is how local and test runs
    behave.
  - It never throws into a caller.
- `product-analytics.repository.ts`: read-only lookups (`prismaRead`) for details the domain
  events don't carry:
  - an order's total, payment method, item quantity, brand count, creator attribution, coupon,
    and how many earlier orders went through;
  - a user's role;
  - a look's product-tag count;
  - a support ticket's requester.
- `product-analytics.utils.ts`:
  - `toStableEventUuid` turns a bus event id into a fixed UUID;
  - `toTrackedOrderStatus`;
  - `toOrderPlacedProperties`.
- `product-analytics.constants.ts`: the consumer group, the order statuses worth tracking, the
  creator-link type mapping, and the prefixes for events with no person behind them.
- `product-analytics.types.ts`: `OrderAnalyticsSummary` and `ServerAnalyticsEvent`.

Env (both optional): `POSTHOG_PROJECT_TOKEN` (the public `phc_...` project token) and
`POSTHOG_HOST` (default `https://us.i.posthog.com`).

## Funnel

**User-facing:** none. Shoppers, creators and brands never see this. The team sees the results
in PostHog and on the admin analytics page.

**Technical:** a module publishes a domain event (for example `product.purchased` from
`orders/checkout/checkout.after-commit.ts`) → Redis stream → this module's consumer group
`product-analytics` → handler reads any extra details through the repository → `captureServerEvent`
→ `posthog-node` batches and sends to PostHog. Creator-link clicks skip the bus:
`creatorLinkService.recordClick` → `captureCreatorLinkClick` → `posthog-node`.

## Non-obvious rationale

- **Its own consumer group, in the `worker` role.** The bus gives each group its own acks,
  retries and dead-letter stream. So a PostHog outage, or a slow lookup here, never delays
  notifications or XP, and it can't fail an order. The consumers are registered in
  `registerBackgroundConsumers`, so the `api` role's request handling isn't involved.
- **Exactly once in PostHog, even when the bus redelivers.** Each event's PostHog `uuid` comes
  from the bus event id (`toStableEventUuid`), and PostHog drops a repeat with the same uuid.
  `product.purchased` itself fires once per order: at checkout for COD, and at payment
  confirmation for eSewa and Khalti.
- **"First order" means the first order that went through.** Earlier online orders that were
  never paid don't count. Earlier COD orders and paid, refunded or partly refunded online orders
  do.
- **Events with no account behind them** (a brand application, a guest's support ticket, a
  signed-out visitor's creator-link click) are sent with `$process_person_profile: false` and a
  prefixed id, so PostHog counts them without creating fake people.
- **No personal data.** No names, emails, phone numbers or addresses are sent. `disableGeoip` is
  on, so PostHog doesn't place every server event at the droplet's location.
- **Refunds count only once money goes back** (`ORDER_REFUND_OUTCOME.ISSUED`), not when the
  shopper is asked for refund details.
- **`user.created` carries `signupMethod`** (`email` from registration, `oauth` from social
  sign-in, `staff_created` from the platform user form). Sign-ups by each method can then be
  compared without guessing.
