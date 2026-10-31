# @outfiqe/utils

## Purpose

Small, pure, framework-free helper functions and constants shared by `apps/api`, `apps/web`, and
`apps/admin` — string/enum formatting, display derivation, and validation regexes that don't belong
to any one app.

## Structure

- `analytics/` — the one catalog of PostHog product-analytics events, shared by `apps/web` (browser events) and `apps/api` (server events). `ANALYTICS_EVENTS` holds every event name, written `area:object_action` in lowercase snake case (`checkout:order_place`, `cart:item_add`) and checked by `ANALYTICS_EVENT_NAME_PATTERN`. `AnalyticsEventProperties` maps each event to the exact properties it carries, so a misspelt event or property is a type error rather than a silent new event in PostHog. `toAnalyticsPaymentMethod` and `toAnalyticsSearchQuery` turn app values into analytics values (lowercase payment method; trimmed, lowercased, capped search text). Properties never carry names, emails, phone numbers or addresses. Why each event exists and how it is sent is in `docs/PLAN-ANALYTICS-POSTHOG.md`.
- `avatar/` — `getAvatarColor` (deterministic palette color from an id) and `initialsFor` (a
  display name's fallback avatar initial).
- `email-logo/` — `EMAIL_LOGO_PATH`, `EMAIL_LOGO_RENDER_SIZE`/`EMAIL_LOGO_DISPLAY_SIZE` and `emailLogoUrl(siteOrigin)`: the one agreement between `apps/web`, which draws the logo PNG at that path (`app/email/logo.png`), and `apps/api`'s email layout, which shows it. The image is drawn at twice the size it is displayed so it stays sharp on high-density screens.
- `format/` — `toTitleCase`, a generic `SNAKE_CASE` -> `Title Case` formatter.
- `time/` — `MS_PER_MINUTE`, `MS_PER_DAY`, `SECONDS_PER_HOUR` and the other time units, for apps that do not use `date-fns`. Also `formatDate`, `formatDateTime` and `formatShortDate`, the one way to show a date in any app. Each shows a dash for a missing or broken date. `toDateInputValue`, `toDayStartIso`, `toDayEndIso` and `isPastDateInputValue` turn date box values into real moments: an "ends on" date uses `toDayEndIso` so it lasts the whole day in the person's own time, not until midnight UTC.
- `phone/` — `NEPAL_PHONE_REGEX`, the phone-number validation pattern this codebase's forms use.
- `logistics-codes/` — `CROCKFORD_BASE32_ALPHABET`, `PICKUP_CODE_LENGTH`,
  `normalizeTypedCode` and `isCrockfordCode`, plus the parcel code helpers (`PARCEL_CODE_PREFIX`,
  `normalizeParcelCode`, `formatParcelCode`), and the courier parcel-number pattern check
  (`isFixedTextPattern`, `suggestReferencePattern`, `describeFixedTextPatternProblem`) the API and
  the admin partner form both use, shared by every app that handles the delivery codes
  (pickup codes, bag tags, parcel codes). A parcel code is stored as `OFQ` + 8 characters and shown
  as `OFQ-XXXX-XXXX`; `normalizeParcelCode` accepts it typed with dashes, spaces, lower case or a
  zero for the O, and returns `null` for anything else:
  - `apps/api` generates the codes from this alphabet.
  - The rider and hub screens normalise a code someone typed by hand before sending it.
  - The alphabet leaves out I, L, O and U. When typing, I and L are read as 1 and O as 0, so a
    misread code still matches.
- `tenant/` — `extractTenantSubdomain(host, baseDomain)` / `isTenantHost(host, baseDomain)` plus
  `TENANT_SUBDOMAIN_REGEX`/`RESERVED_TENANT_SUBDOMAINS`, the one definition of "what counts as a
  tenant subdomain". `apps/api`'s `crm-access` module re-exports these as `extractSubdomain`/
  `SUBDOMAIN_REGEX`/`RESERVED_SUBDOMAINS` for its `resolveTenant` middleware; `apps/web`
  (`useTenantHost`) and `apps/admin` (`isOnTenantHost`) use them to only show the storefront ⇄ CRM
  cross-links, and only honour a cross-app `?redirect=` after login, when the browser is actually on
  a tenant subdomain rather than the apex domain.
- `platform-access/` — `PLATFORM_SECTION_ACCESS`, the one map from every platform menu section
  (`PlatformNavKey`) to the permissions that open it (or co-founder only), with
  `canAccessPlatformSection` and `findInaccessiblePlatformSections`. `apps/api` builds each
  session's hidden sections from it, and `apps/admin`'s menu, page guard and landing page read the
  result, so the menu and the server can't disagree about who sees a section.
- `user-role/` — `STAFF_USER_ROLES` and `isStaffUserRole(role)`, the one definition of "either kind of staff account" (`ADMIN` platform staff or `TENANT_STAFF`). `apps/api`'s engagement guard and CRM invite check, `apps/web`'s sign-in destination and auth context, and `apps/admin`'s app gate all use it instead of comparing against `ADMIN` directly.
- `post-layout/` — `POST_LAYOUT_VALUES`/`POST_LAYOUT`/`PostLayout`, the creator post's layout
  enum (`PORTRAIT`/`SQUARE`/`TALL`), plus `POST_LAYOUT_ASPECT` (the crop/display aspect ratio for
  each) and `POST_LAYOUT_LABEL` (the picker's display labels).
- `logistics-alerts/` — `LogisticsAlertType`, `LOGISTICS_ALERT_TYPES`, `LOGISTICS_ALERT_LABELS`
  (the plain-English name of each delivery alert, shared by the admin alerts page, the staff
  notification and its push) and `isLogisticsAlertType`. It sits here for the same reason as
  `order-tracking/` below.
- `order-tracking/` — `OrderTrackingStage` (the one customer-facing stage of a hub-delivered
  order), `ORDER_TRACKING_STAGE_MESSAGES` (the words for each, used by in-app and push
  notifications) and `isOrderTrackingStage`. It lives here rather than in `@outfiqe/types` because
  `@outfiqe/types` depends on this package, so the messages and the stage must sit together here.
- `product-sort/` — `PRODUCT_SORT_VALUES`/`PRODUCT_SORT`/`ProductSort`, the shop's sort-order enum.
- `public-build-sort/` — `PUBLIC_BUILD_SORT`/`PublicBuildSort`, the public Builds feed's sort
  orders (newest, most cheriqed, price low to high, price high to low). The API validates the
  `sort` query against it and the web feed's sort menu offers exactly these.
- `product-type/` — `DEFAULT_PRODUCT_TYPES`, the seed/migration list of garment types, each
  saying whether it `supportsFitRanges` (headwear, footwear and accessories don't: height and
  weight say nothing about their size). Garment
  types are now an admin-managed table (`apps/api/src/modules/product-types`); this constant only
  bootstraps the defaults: the six originals plus footwear, accessories, saree, kurta set and
  lehenga, which Outfit Build slots need.
- `outfit-slots/` — the Outfit Build slot rules, shared by the API (which enforces them inside the
  transaction) and the web board (which uses them to grey out slots and explain a refusal before a
  request is sent). `findPlacementRefusal` returns the first rule a placement breaks, as a named
  `OUTFIT_PLACEMENT_REFUSAL` code: unknown slot, position outside the slot (`SLOT_FULL`), wrong
  product type, blocked by an exclusive slot (a filled Full Outfit blocks Top and Bottom, and the
  other way round), the same product already on the board, the board cap, or the per-person limit.
  A placement onto a filled position is a swap: the replaced item stops counting, and the new one
  counts towards whoever placed it. `findBlockedSlotKeys` lists the slots that can't be filled
  right now. `OUTFIT_SLOT_ICONS` is the fixed icon set admins pick from, and
  `OUTFIT_ITEMS_PER_MEMBER_CHOICES` the owner's per-person limit options.
- `notifications/` — `formatActorList`, the grouped-notification actor-list formatter (`"Jane"` ->
  `"Jane and John"` -> `"Jane, John and 3 others"`), used by `@outfiqe/components`'
  `resolveNotificationMessage.ts`.
- `uuid/` — `generateUuid`, an RFC 4122 v4 UUID generator that falls back to
  `crypto.getRandomValues` when `crypto.randomUUID` isn't available.
- `size-fit/` — `recommendFitSize`, the one rule for which of a product's sizes fits a shopper's
  height and weight, using the ranges the brand set on each size. The API runs it to label each
  result on the "Find what fits me" page, and the web product page runs it in the browser for the
  "Find my size" modal, so both always agree and the modal answers without a request. Also the
  measurement bounds (`FIT_HEIGHT_CM_MIN`/`MAX`, `FIT_WEIGHT_KG_MIN`/`MAX`) that both sides
  validate against, and the `FitRange`/`FitRecommendation` types.
- `index.ts` — re-exports everything above; every app only ever imports from `@outfiqe/utils`.

## Non-obvious rationale

**`generateUuid` doesn't just call `crypto.randomUUID()` directly** — that method requires a
secure context (HTTPS, or the browser's `localhost` exception), which not every environment this
app is accessed from satisfies (a LAN IP over plain HTTP during on-device testing, for one).
`crypto.getRandomValues`, unlike `randomUUID`, has no such restriction, so the fallback path
constructs an RFC 4122 v4 UUID from it by hand — same randomness quality, no secure-context
requirement. Every call site across the apps that generates a client-side id (idempotency keys,
optimistic-update temp ids, the anonymous session id) should use this instead of
`crypto.randomUUID()` directly.

**`formatActorList` pluralizes off `actorCount`, the notification's true total actor count —
never `recentActors.length`.** The write path caps `recentActors` at 3 (`MAX_RECENT_ACTORS`, see
`apps/api/src/modules/notifications/README.md`) so the metadata payload stays small, but the
displayed count still needs to reflect the real number of people who liked/followed, not just how
many names got stored.

**How `recommendFitSize` picks a size.** Sizes must be passed smallest first (the product's size
order); sizes without a range, or with an inverted one, are ignored. For each size it measures how
far the shopper sits outside the range, as `heightGap / HEIGHT_STEP_CM + weightGap / WEIGHT_STEP_KG`
(both steps 5, roughly one size step), so 0 means the size fits on both.

- One size fits: that size. On a non-stretch piece, when the shopper is in the top
  `EDGE_ZONE_RATIO` (20%) of either range and the next size up is within one step, the next size is
  offered as "size up for room".
- Two or more fit (overlapping ranges): the size whose range centre is closest wins, the other is
  "also fits".
- None fits but the nearest is within `NEAR_FIT_MAX` (one step) and has a charted neighbour:
  `BETWEEN_SIZES`, the closer of the two first.
- Otherwise `NO_FIT`, with the nearest size and the signed offsets (positive = above its range).

Whenever the two candidates are within `TIE_MARGIN` (0.25) of each other, stretch decides:
stretchable picks the smaller size, non-stretch and unknown pick the larger, because a too-tight
non-stretch garment can't be worn while a slightly loose one can.
