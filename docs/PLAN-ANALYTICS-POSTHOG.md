# Product analytics with PostHog

## Why

Today we can see what is in the database (orders, payouts, CRM counts on `/platform`), but not
how people get there. We can't answer:

- Where do shoppers drop out between seeing a product and paying?
- Do muse looks sell clothes? Which looks and which creators drive orders?
- Which sources bring buyers rather than just visitors (Instagram, TikTok, creator links, search)?
- Do people come back? Do second orders happen?
- What do shoppers search for that we don't have?

PostHog answers these, and the admin panel will show the answers next to the business numbers
we already have.

## What matters most

In order of importance. Each one is a question the team will act on, not a vanity number.

1. **The purchase funnel.** Product page → add to cart → checkout start → order placed, split by
   payment method (COD, eSewa, Khalti) and by device. This is where revenue leaks.
2. **Look-to-order (the reason Outfiqe exists).** Look opened → tagged product tapped → product
   page → add to cart → order. Split by creator. This proves, or disproves, that muse looks sell
   clothes, and it tells us which creators to back.
3. **Acquisition that converts.** Visitors, sign-ups and first orders by source: UTM campaign,
   referrer, and creator links (`/r/...`). This shows where to spend effort.
4. **Activation.** Share of new accounts that do something meaningful within 7 days: follow a
   creator or brand, save something, add to cart. For creators: first look posted with product
   tags. For brands: first sale.
5. **Retention and repeat purchase.** Weekly cohort retention for shoppers, and how many buyers
   place a second order within 60 days.
6. **Supply health.** Creators who posted a look this week, tag approval rate, and brands with at
   least one sale this month.
7. **Search gaps.** Top searches with zero results.
8. **Feature adoption.** Outfit builds, PWA installs and push opt-ins.

Revenue, GMV, commissions and payouts stay **database numbers** (the existing
`financial-rollup` and `platform-metrics`). PostHog's own guidance is that backend data is the
truth for business counts, and analytics events can be blocked or lost.

## Key decisions (recommended)

| Decision               | Recommendation                                                                                                                                                          | Why                                                                                                                                                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting region         | **PostHog US Cloud** (project 550784)                                                                                                                                   | Our users are in Nepal, so EU data rules don't apply, and speed from Nepal is about the same. Events reach PostHog through our own domain either way.                                                                 |
| Projects               | **One project, production only** (website and app together)                                                                                                             | PostHog recommends one project for site and app, so funnels can cross both. The free plan allows one project, so local and preview builds send nothing, and team accounts are flagged `is_internal` and filtered out. |
| Server vs browser      | **Purchases, sign-ups, approvals and payments from the API**; browsing, clicks and funnels from the browser                                                             | Ad blockers and closed tabs drop browser events; the API never misses an order.                                                                                                                                       |
| Session replay         | **On at launch, production set-up:** every checkout, payment and error session recorded, 20% of the rest, all inputs masked, sensitive pages fully masked, consent only | Seeing why people abandon checkout is worth it, but card, phone and address data must never be recorded.                                                                                                              |
| Consent                | **Cookie banner.** Accept = full tracking. Reject = cookieless, anonymous counting (`cookieless_mode: "on_reject"`)                                                     | Keeps counts honest without tracking people who said no. Needs the privacy and cookie policy update (see Legal).                                                                                                      |
| Group analytics        | **Not now**                                                                                                                                                             | It is a paid add-on. `brand_id` and `creator_id` as event properties answer the same questions for now.                                                                                                               |
| PostHog feature flags  | **Don't use**                                                                                                                                                           | We already have platform feature switches. Two flag systems would conflict.                                                                                                                                           |
| PostHog error tracking | **Off** (`capture_exceptions: false`)                                                                                                                                   | Sentry already does this.                                                                                                                                                                                             |
| Admin app tracking     | **Not at first**                                                                                                                                                        | Staff usage isn't the question we need answered. Add it later with an `app: "admin"` property if needed.                                                                                                              |
| Cost guard             | **Free plan with no card**, so PostHog stops collecting instead of charging. Set billing limits for every product if a card is ever added.                              | Same lesson as the Vercel CPU spike: usage must never surprise us. The free tier is 1M events and 5,000 recordings a month (check posthog.com/pricing for current limits).                                            |

## Naming rules

We follow PostHog's naming guidance.

- **Events:** lowercase, snake_case, `area:object_action`, present-tense verb. For example
  `cart:item_add` or `checkout:order_place`.
- **Fixed names:** never build a name from a value (`page_${name}`). Put the value in a property.
- **Properties:** `object_adjective`. For example `product_price_npr` or `cart_item_count`.
  Booleans start with `is_` or `has_`; dates end in `_date`.
- **Changed flows:** when a flow changes a lot, add a versioned event (`checkout_v2:order_place`)
  instead of changing what an old event means.
- **One catalog:** every event name and its properties live in one typed catalog in
  `packages/utils` (`analytics/`). The web app and the API both import it. A typo is a type
  error, not a silent new event.

## Identity and privacy

- **`distinct_id` is our user id** (the database id). Never an email, a phone number or
  `"anonymous"`.
- **Browser:** `posthog.identify(user.id)` once the session loads in `AuthContext`, and
  `posthog.reset()` on logout. Anonymous browsing before login joins the account at identify.
- **API:** server events use the same user id. Events with no user (cron jobs, system work) set
  `$process_person_profile: false`.
- **Person properties (no personal data):** `role`, `is_creator`, `is_brand_owner`,
  `signup_method`, `signup_date`, `first_order_date` (`$set_once`). **Never send** name, email,
  phone, address, bank details or payment references.
- **Super properties on every browser event:** `app: "web"`, `app_env`, `is_pwa` (opened as
  installed app), `locale`.
- **Internal users** (team accounts, riders, staff) get `is_internal: true`. Every dashboard
  filters them out. Riders also get `role: "rider"`, so logistics use never counts as
  shopping.
- **Bots** are filtered by PostHog by default (Sentry's uptime bot would have been).

## Event catalog (first version)

**From the API: the source of truth.** These come through the existing domain event bus (see
"How the API sends events").

| Event                                          | When                                                    | Main properties                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `account:user_create`                          | Account created (`user.created`)                        | `signup_method`, `role`                                                                                                                      |
| `account:email_verify`                         | `user.email.verified`                                   |                                                                                                                                              |
| `creator:application_approve`                  | `creator.approved`                                      |                                                                                                                                              |
| `brand:application_submit`                     | `brand.application.submitted`                           |                                                                                                                                              |
| `look:post_create`                             | `look.created`                                          | `look_id`, `product_tag_count`                                                                                                               |
| `look:product_tag_approve`                     | `product.tag.approved`                                  | `look_id`, `product_id`, `brand_id`                                                                                                          |
| `checkout:order_place`                         | `product.purchased`                                     | `order_id`, `order_total_npr`, `cart_item_count`, `brand_count`, `payment_method`, `is_first_order`, `has_creator_attribution`, `has_coupon` |
| `order:status_change`                          | `order.status.changed` (delivered, cancelled, returned) | `order_id`, `order_status`                                                                                                                   |
| `order:refund_issue`                           | `order.refund.updated`                                  | `refund_amount_npr`, `refund_method`                                                                                                         |
| `creator:commission_earn`                      | `sale.generated`                                        | `commission_amount_npr` (sent as the creator)                                                                                                |
| `social:creator_follow`, `social:brand_follow` | `user.followed`, `brand.followed`                       | `creator_id` / `brand_id`                                                                                                                    |
| `creator_link:link_click`                      | `POST /creator-links/:token/click`                      | `creator_id`, `link_type`                                                                                                                    |
| `support:ticket_create`                        | `support.ticket.created`                                | `ticket_category`                                                                                                                            |

**From the browser: journeys and intent.**

| Event                                                      | When                                             | Main properties                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `$pageview` / `$pageleave`                                 | Automatic (`capture_pageview: "history_change"`) |                                                                                                     |
| `look:detail_view`                                         | A look opens                                     | `look_id`, `creator_id`, `look_source`                                                              |
| `look:product_tag_click`                                   | A tagged product is tapped on a look             | `look_id`, `creator_id`, `product_id`                                                               |
| `product:detail_view`                                      | Product page shown                               | `product_id`, `brand_id`, `product_price_npr`, `view_source` (look, search, rail, collection, link) |
| `wishlist:item_add`                                        | Heart tapped                                     | `product_id`                                                                                        |
| `cart:item_add` / `cart:item_remove`                       | Cart changed                                     | `product_id`, `brand_id`, `product_price_npr`, `item_quantity`, `add_source`                        |
| `checkout:checkout_start`                                  | Checkout page opened with items                  | `cart_value_npr`, `cart_item_count`                                                                 |
| `checkout:payment_method_select`                           | Method picked                                    | `payment_method`                                                                                    |
| `checkout:order_submit`                                    | Place-order pressed                              | `payment_method`                                                                                    |
| `checkout:payment_fail`                                    | Gateway returns a failure                        | `payment_method`, `failure_code`                                                                    |
| `search:query_submit`                                      | Search run                                       | `search_query` (lowercased, trimmed, max 100 chars), `result_count`, `is_zero_result`               |
| `taste:category_select`                                    | Taste picker changed                             | `category_count`                                                                                    |
| `outfit_build:build_create` / `outfit_build:build_publish` | Outfit build used                                | `build_id`                                                                                          |
| `app:pwa_install` / `app:push_enable`                      | Installed / allowed notifications                |                                                                                                     |

`checkout:order_submit` (browser) and `checkout:order_place` (API) are both kept on purpose. The
gap between them shows orders that failed after the button press.

## How it is built

### Set up PostHog

- The production project is on US Cloud, project 550784, free plan. With no card added it can't
  charge; it stops collecting past the free limits. Already done in PostHog:
  - web analytics domains `https://outfiqe.com` and `https://www.outfiqe.com` (wildcards aren't
    allowed);
  - cookieless tracking turned on (the SDK ignores cookieless events otherwise);
  - web vitals capture turned on.

  Still to add: an "internal users" filter (`is_internal = true`, plus `$host` not equal to
  `localhost`), made the default.

- Keys:
  - project token (public): `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` in Vercel (web, production
    only), and `POSTHOG_PROJECT_TOKEN` in `deploy/.env.prod`;
  - a **personal API key with Query Read only**: `POSTHOG_QUERY_API_KEY`, API server only,
    never in a browser;
  - `POSTHOG_PROJECT_ID` and `POSTHOG_HOST`.

### Web app (`apps/web`)

- **Load PostHog through `src/instrumentation-client.ts`**, PostHog's current recommended entry
  point for the App Router. Use `defaults` set to the newest dated value,
  `person_profiles: "identified_only"`, `capture_pageview: "history_change"`,
  `capture_exceptions: false`, `cookieless_mode: "on_reject"`, and a `before_send` that drops
  any property that looks like an email or phone number. Only initialise when
  `NEXT_PUBLIC_APP_ENV === "prod"` and the token is set, so local and preview builds send
  nothing.
- **Reverse proxy through our own domain**, so ad blockers don't drop events. Add `next.config.ts`
  rewrites from a neutral path (for example `/a7x`, not `/analytics` or `/ingest`) to
  `us.i.posthog.com` and `us-assets.i.posthog.com`, and set `skipTrailingSlashRedirect: true`.
  Set `api_host` to `/a7x` and `ui_host` to `https://us.posthog.com`.
  - **Must:** add `a7x` to the negative lookahead in `src/proxy.ts`'s matcher. Otherwise every
    analytics call runs the proxy function and burns Active CPU, the exact problem we just
    fixed. External rewrites on Vercel don't start a function, so this way the relay costs no
    CPU.
  - **Must:** make the service worker (`app/sw.ts` / Serwist) never cache the `/a7x` path.
- **CSP:** events go to `'self'` through the relay, and lazy-loaded PostHog scripts load from
  the relay as well. Confirm `connect-src`, `script-src` (`strict-dynamic` on nonce pages) and
  `worker-src blob:` (replay) still allow them, and add a test in `contentSecurityPolicy.test.ts`.
- **A new `features/analytics` feature** owns all of it:
  - `trackEvent()` only accepts catalog events. Components call it from event handlers, not
    `useEffect`, except the one-off `*_view` events.
  - `AnalyticsIdentity`, mounted inside `AuthProvider`: `identify` on sign-in and `reset` on
    sign-out. Person properties come from the session's user.
  - The cookie banner. It lives in the web app rather than the design system, because only the
    shopper website uses it. It is shown once and remembered; a "Cookie settings" link in the
    footer reopens it. Accept calls `opt_in_capturing()`; "Essential only" switches to
    cookieless.
- **Session replay (production set-up, on at launch, only after consent):**
  - **Always record sessions that matter**, using PostHog's URL and event triggers:
    - any visit to `/checkout` or `/payments`, or a visit that fires `checkout:checkout_start`;
    - any visit with `checkout:payment_fail` or a captured error.
  - **Sample 20% of all other sessions.**
  - **Minimum duration of 5 seconds**, so bounces don't use the quota.
  - **Privacy:**
    - `maskAllInputs: true`;
    - full text masking (`ph-no-capture` / `data-ph-mask`) on checkout, addresses, bank
      accounts, withdraw, payments and the whole rider app;
    - network payload and header capture off;
    - console log capture off;
    - canvas recording off.
  - Recordings are tied to the user id after `identify`, so support can find a shopper's session
    from their account. No personal details are in the recording itself.
  - On the free plan, recording stops at 5,000 a month rather than charging.

### How the API sends events (`apps/api`)

- **A new `product-analytics` module** with `posthog-node`. The API is a long-running server, so
  default batching is fine (unlike serverless). Call `shutdown()` in the existing graceful
  shutdown, so queued events are sent on deploy.
- **It listens to the domain event bus**, using `subscribeToDomainEvent` with its own consumer
  group (`product-analytics`). It gets the bus's acks, retries and dead-letter stream for free,
  and no business code changes. A PostHog outage then can't fail an order. Events wait in Redis
  and retry.
- **Enrichment:** bus payloads are thin (`{ orderId, userId }`). The handler reads what the event
  needs (order total, payment method, brand count, attribution) through the owning module's
  service, read-only, one query per event.
- **Runs in the `worker` process role** (`PROCESS_ROLE=worker`), not the API role, so request
  latency is never affected.
- **One order, one `checkout:order_place`.** `product.purchased` is published exactly once per
  order: at checkout for COD (`orders/checkout/checkout.after-commit.ts`), and at payment
  confirmation for eSewa/Khalti (`payments/payment.service.ts`). The bus can still redeliver a
  message, so each PostHog event gets a fixed id made from the bus `eventId`, and a redelivery is
  never counted twice.

### Admin dashboards (`apps/admin` + `apps/api`)

**How:** the admin panel never talks to PostHog directly. The API asks PostHog's Query API
(HogQL), caches the answer, and returns plain numbers.

- **Who can see it:** co-founders always, plus anyone whose platform role is given the new
  permission in role management.
  - Add `platform:analytics:read` ("View product analytics", group "Platform") to
    `PLATFORM_PERMISSION_CATALOG` in `platform-access`. It then shows up in the custom-role
    builder like every other permission.
  - The rule already exists: `canAccessPlatformSection` in `@outfiqe/utils` lets a co-founder in,
    or anyone holding one of the section's permissions. Analytics adds one entry,
    `"platform-analytics": anyOf("platform:analytics:read")`, to `PLATFORM_SECTION_ACCESS`.
  - The API routes check that same rule with a small guard next to `requirePlatformNavItem`.
    The super-admin membership passes, as it does everywhere.
  - Nobody gets it by default: no existing role is granted the permission automatically.
  - The sidebar hides the item for everyone else through the existing
    `findInaccessiblePlatformSections`, and co-founders can also hide it per admin through nav
    access.
- **API:** add routes to `product-analytics`, with endpoints under
  `/api/platform/analytics/*` behind `requireAuth` and the access rule above:
  - `overview?range=7d|30d|90d`: visitors, sign-ups, activation rate, buyers, and
    visit-to-order conversion;
  - `funnels/purchase` and `funnels/look-to-order`: step counts and drop-off, split by payment
    method or creator;
  - `acquisition`: top sources, UTM campaigns, and creator-link clicks → sign-ups → orders;
  - `retention`: weekly shopper cohorts and repeat-purchase rate;
  - `search/zero-results`: top queries with no results.
  - Each query is a named HogQL constant. Each one always has a time range, and the query
    `name` makes it show in PostHog's query log.
- **Caching and limits:** cache each answer in Redis for 15 minutes with the existing
  `cacheService` pattern. If PostHog is slow or down, fail open: return the last cached answer
  marked stale, or an "analytics unavailable" state. The rest of the admin page keeps working,
  following the same pattern as the trending caches. This keeps us far below PostHog's API
  limits (240/minute, 2,400/hour, 3 at a time).
- **Admin UI:** a `platform-analytics` feature in the Platform section. It reuses `StatCard`,
  `ChartCard` and `TrendChart` (Recharts, already in the design system), has a range picker, and
  every chart has an "Open in PostHog" link for deeper digging. Revenue cards beside it keep
  reading the database (`financial-rollup`), clearly labelled.
  - Empty states for "no data yet".
  - Loading skeletons.
  - The page states plainly that analytics numbers are close estimates and order numbers are
    exact.

**What the admin page shows (first version):**

| Card / chart                                                     | Source                                    |
| ---------------------------------------------------------------- | ----------------------------------------- |
| Visitors, sign-ups, buyers, conversion rate                      | PostHog                                   |
| Orders, GMV, average order value                                 | Database (existing)                       |
| Purchase funnel, with drop-off per step and payment-method split | PostHog                                   |
| Look-to-order funnel and top creators by attributed orders       | PostHog (funnel) + database (commissions) |
| Top sources and campaigns → sign-ups → first orders              | PostHog                                   |
| Weekly retention cohorts and repeat-purchase rate                | PostHog                                   |
| Zero-result searches                                             | PostHog                                   |
| Creators posting this week, tag approval rate, brands with sales | Database                                  |

The same insights also go on a PostHog dashboard (built in PostHog), for anyone who wants to dig
past the admin view.

### Legal

Analytics collects new personal data (device, pages, behaviour, and recordings with consent).
The privacy policy and cookie policy must say so before this goes live. The legal pages are
already waiting for lawyer review, and analytics should go into that same review. The consent
banner ships in the same release as the SDK, never after it.

## Order of work

1. **PostHog set-up and the shared event catalog.** No user-facing change.
2. **Browser SDK, reverse proxy, identity and consent banner**, with only `$pageview` and the
   purchase funnel events, behind a production-only check.
3. **API event consumer** for the server events in the catalog.
4. **The remaining browser events:** look-to-order, search, taste, outfit builds, PWA.
5. **Admin analytics page and API query endpoints.**
6. **Session replay**, after the consent banner and masking are checked on real pages.

Each step ships with its tests (catalog types, the consumer's event mapping with PostHog mocked,
the API query endpoints with PostHog mocked, admin page states with MSW) and its module READMEs,
as usual.

## Check after each release

- PostHog's live events view shows events from `outfiqe.com`, through `/a7x`, with the expected
  names and properties, and no email or phone anywhere.
- Vercel Active CPU doesn't move (the relay path skips the proxy function).
- One test order → exactly one `checkout:order_place`.
- Reject on the banner → no person profile, no recording, only cookieless counts.
- The admin analytics page loads from cache on refresh, and shows the "unavailable" state when
  the PostHog key is removed.

## Decided

- PostHog US Cloud, free plan, one production project (550784).
- Built as the full production feature, not a trial.
- Session replay is on at launch, with the production set-up above.
- The admin analytics page is for co-founders, plus anyone whose role is given
  `platform:analytics:read` in role management.
- Placeholder cookie banner wording until the lawyer's version (below).

## Cookie banner wording (placeholder until the lawyer's version)

> **Cookies on Outfiqe**
> We use essential cookies to keep you signed in and your cart saved. With your permission, we
> also use analytics cookies to understand how people use Outfiqe, including masked recordings
> of some visits, so we can fix problems and make it better. Personal details like your phone
> number and address are always hidden. We never sell your data.
>
> **[Accept all]** **[Essential only]** · [Cookie policy](/legal/cookies)

- **Accept all:** `opt_in_capturing()`, giving full analytics and, if session replay is on, a
  chance of a masked recording.
- **Essential only:** cookieless, anonymous counts only. No person profile, no recording.
- Shown once and remembered. A "Cookie settings" link in the footer reopens it.
- The text lives in the i18n messages (`en.json`, `ne.json`). A native speaker should check the
  Nepali, and the lawyer's version replaces both later.
