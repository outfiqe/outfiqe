# product-analytics

## Purpose

Two jobs, both around PostHog:

1. **Sending.** It sends the events the business depends on to PostHog from the server, so they're
   never lost to an ad blocker or a closed tab: sign-ups, placed orders, deliveries,
   cancellations and returns, refunds, creator commissions, new looks, follows, creator-link
   clicks and support tickets.
2. **Reading.** It answers the admin analytics page (`/platform/analytics`) by asking PostHog's
   Query API, caching the answers and returning plain numbers. The browser never talks to
   PostHog's API, and the read key never leaves the server.

Event names and properties come from the shared catalog in `@outfiqe/utils` (`ANALYTICS_EVENTS`),
the same one the web app uses. Why we measure each one is in `docs/PLAN-ANALYTICS-POSTHOG.md`.

## Structure

**Sending (module root):**

- `product-analytics.events.ts`: `registerProductAnalyticsEventConsumers`. It turns domain
  events into PostHog events, grouped by area (account, commerce, creator, social, support).
- `product-analytics.service.ts`: `productAnalyticsService`, the root object other modules
  import.
  - `captureServerEvent` sends one catalog event.
  - `captureCreatorLinkClick` is used by `creator-links`.
  - `flushPendingEvents` is a shutdown step in every process role.
  - The insights topic's methods are spread in.
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

**Reading (admin dashboards):**

- `product-analytics.routes.ts`: `GET /api/platform/analytics/{overview, funnels/purchase,
funnels/look-to-order, acquisition, retention, search/zero-results}?range=7d|30d|90d`, behind
  `platformGuards.analyticsRead`.
- `product-analytics.controller.ts`, `product-analytics.schemas.ts` (`range`, default `30d`).
- `insights/insights.service.ts`: `productAnalyticsInsightsService`, one method per insight.
  `loadInsight` handles the cache and every failure state.
- `insights/insights.queries.ts`: the HogQL for each insight. Each query is a fixed string built
  from catalog constants plus a whole number of days, so there is no user input in it.
- `insights/insights.posthog-query.ts`:
  - `findPosthogQueryConnection` is `null` unless both the project id and the read key are set;
  - `runPosthogQuery` makes a named `POST /api/projects/:id/query/` call, with at most two
    running at once.
- `insights/insights.repository.ts`: `findCreatorNames`, which looks up the names of the most-viewed muses (at most 10 ids, invalid ids skipped) so the cached answer shows names, not ids.
- `insights/insights.utils.ts`: reads PostHog's result rows into numbers, labelled counts and
  ordered funnel steps.
- `insights/insights.constants.ts`: the ranges, insight names, statuses, cache lifetimes, the
  query timeout, list sizes, and the PostHog page each insight links to.
- `insights/insights.types.ts`: one type per insight, plus `InsightResult`.

**Env (all optional):**

- `POSTHOG_PROJECT_TOKEN`: the public `phc_...` token. It is needed for sending.
- `POSTHOG_HOST`: default `https://us.i.posthog.com`.
- `POSTHOG_PROJECT_ID` (550784) and `POSTHOG_QUERY_API_KEY` (a personal `phx_...` key with only
  the Query Read scope): both are needed for reading.
- `POSTHOG_APP_HOST`: default `https://us.posthog.com`.

## Funnel

**User-facing:** shoppers, creators and brands never see this module. Co-founders, and staff whose
role has "View product analytics", open Product analytics in the admin sidebar (Growth) and see
visitors, funnels, sources, retention and failed searches for the last 7, 30 or 90 days.

**Technical, sending:** a module publishes a domain event (for example `product.purchased` from
`orders/checkout/checkout.after-commit.ts`) → Redis stream → this module's consumer group
`product-analytics` → handler reads any extra details through the repository → `captureServerEvent`
→ `posthog-node` batches and sends to PostHog. Creator-link clicks skip the bus:
`creatorLinkService.recordClick` → `captureCreatorLinkClick` → `posthog-node`.

**Technical, reading:** admin `features/platform-analytics` → `GET /api/platform/analytics/...` →
`platformGuards.analyticsRead` → controller → `productAnalyticsService.<insight>(range)` →
`loadInsight`:

1. no PostHog connection → `not_connected`;
2. the 15-minute cache → `fresh`;
3. PostHog Query API → cache the answer for 15 minutes, plus a week as the last good copy →
   `fresh`;
4. PostHog failed → the last good copy as `stale`, or `unavailable`.

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
- **Who can read the dashboards.** The `platform:analytics:read` permission appears in the
  custom-role builder.
  - Co-founders hold every platform permission automatically (`isPlatformSuperAdmin`).
  - The built-in full-access Admin role gets it from migration
    `20261030120000_add_platform_analytics_permission`, as `prisma/seed-crm.ts` would on every
    deploy anyway.
  - Any other role sees it only when a co-founder ticks it.
- **Caching keeps us inside PostHog's limits** (3 concurrent queries, 240 a minute, 2,400 an
  hour per project). The page asks for six insights, about 13 queries, so queries run at most
  two at a time, and each answer is reused for 15 minutes.
- **Failures never break the admin page.** A Redis read or write failure is logged and skipped.
  A PostHog failure falls back to the last good copy, shown as "stale", for up to a week.
  PostHog error details are logged, never returned.
- **Numbers are close estimates.** Funnel steps count people who did each step in the range, not
  a strict ordered funnel; the "Open in PostHog" link goes to PostHog's own funnel tools for
  that. The look-to-order funnel only counts people who opened a look in the same range
  (`lookViewersReachingEachStepQuery`). Without that filter, its product, cart and order steps
  would count every shopper on the site. Staff and riders flagged `is_internal` are left out of every query. Orders and money on
  the admin page come from the database (`financial-rollup`), which is exact.
