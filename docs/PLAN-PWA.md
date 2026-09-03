# PWA Plan — Advanced, Offline-Capable, iOS + Android

Scope: turn `apps/web` (Next.js 16 App Router, React 19) into an installable, offline-capable
PWA with push notifications, offline reads, offline queued writes, and platform integration
(share target, shortcuts, badging). `apps/admin` is out of scope beyond bare installability.

This is an engineering plan. Product copy, exact toggle placement, and final device list are
refined per chunk. Nothing here ships without tests in the same commit (repo bar).

---

## Locked decisions

| Area                 | Decision                                                                        | Why                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service worker layer | `@serwist/next` + `serwist`                                                     | Actively maintained Workbox successor with first-class Next App Router support. `next-pwa` is abandoned; `@ducanh2912/next-pwa` points new projects to Serwist. |
| Web app manifest     | Keep Next metadata API (`apps/web/src/app/manifest.ts`), expand it              | Already present; typed; no static file to drift.                                                                                                                |
| Offline read cache   | `@tanstack/react-query-persist-client` + `idb-keyval`                           | TanStack Query v5 is already the data layer; persist its cache to IndexedDB rather than invent one.                                                             |
| Offline write queue  | Serwist `BackgroundSyncPlugin` queue **+** an app-side drainer                  | Background Sync API is Chromium-only; iOS needs the same queue drained on `online`/`visibilitychange`. One queue, two drainers.                                 |
| Push transport (API) | New `apps/api/src/modules/push/` consuming existing Redis Streams domain events | Reuses the event backbone the in-app notifications already run on; independent consumer group so it acks separately.                                            |
| Push library         | `web-push` (VAPID)                                                              | Standard, no third-party service, no vendor lock.                                                                                                               |
| Feature home (web)   | `apps/web/src/features/pwa/` with `README.md`                                   | Matches feature-folder convention.                                                                                                                              |
| Shared types         | `PushSubscription` DTO + PWA capability types in `packages/types`               | Consumed by web + api.                                                                                                                                          |
| Kill switch          | Reuse platform feature-flag infra to disable SW push / precache in an emergency | Same pattern as other platform-level toggles.                                                                                                                   |

---

## Platform capability matrix (what each chunk must respect)

| Capability                             | Android Chrome               | iOS Safari 16.4+ (installed)                | iOS Safari (browser tab)          | Fallback when absent                          |
| -------------------------------------- | ---------------------------- | ------------------------------------------- | --------------------------------- | --------------------------------------------- |
| Install prompt (`beforeinstallprompt`) | Yes                          | No event                                    | No event                          | Custom "Add to Home Screen" instruction sheet |
| Service worker + precache              | Yes                          | Yes                                         | Yes                               | App runs online-only, no crash                |
| Web Push (`PushManager`)               | Yes (tab or installed)       | Yes, **installed only**, needs user gesture | No                                | Hide opt-in; show "install to enable"         |
| Background Sync API                    | Yes                          | No                                          | No                                | Drain queue on `online` + `visibilitychange`  |
| Periodic Background Sync               | Yes (installed + engagement) | No                                          | No                                | Revalidate on app focus                       |
| App Badging (`setAppBadge`)            | Yes (installed)              | Yes (installed)                             | No                                | Skip silently                                 |
| Web Share Target (inbound)             | Yes                          | No                                          | No                                | Document as Android-only                      |
| Web Share (outbound `navigator.share`) | Yes                          | Yes                                         | Yes                               | Copy-link button                              |
| Manifest `shortcuts`                   | Yes                          | Ignored                                     | Ignored                           | No-op                                         |
| `navigator.storage.persist()`          | Grantable                    | Often auto-decided                          | Auto-decided                      | Degrade; handle rejection                     |
| IndexedDB                              | Yes                          | Yes                                         | Yes (blocked in Lockdown/private) | Catch, run without persistence                |

Every feature is behind a runtime feature-detect. Absence degrades; it never throws (CLAUDE.md
resilience rules).

---

## Chunks

Commit per chunk. No chunk numbers in PR titles/bodies. Suggested branch:
`feat/pwa-<slice>` per chunk or one `feat/pwa` with stacked commits.

### Chunk 1 — Manifest hardening + install assets + iOS head tags

- Expand `manifest.ts`: `id`, `scope`, `lang`, `dir`, `orientation`, `display_override`,
  light/dark `theme_color`, `categories`, `shortcuts` (Create, Explore, Notifications, Search),
  `screenshots` (one narrow ~1080x1920, one wide ~1920x1080 — richer Android/desktop install UI).
- PNG icon set via `pwa-asset-generator`: 192, 512, and maskable variants into `public/icons/`.
  Keep existing `logo.svg` as an extra `any` entry.
- iOS: generate `apple-touch-icon` (180) and `apple-touch-startup-image` splash set into
  `public/splash/`; add the `<link rel="apple-touch-startup-image">` + `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style` + `apple-mobile-web-app-title` tags in the root layout
    metadata.
- Android: `mobile-web-app-capable`, `theme-color` meta synced to manifest.
- No service worker yet.
- **Deliverable:** installs on Android (with screenshots dialog) and iOS (correct icon + splash).
  Lighthouse "installable" passes.
- **Tests:** `manifest.ts` unit (required fields, icon purposes), head-tag snapshot test.

### Chunk 2 — Serwist service worker: precache + app shell + `/offline`

- Add `@serwist/next`; wrap `next.config.ts`; SW source at `apps/web/src/app/sw.ts`.
- Precache the Next build output (Serwist injects the manifest).
- Headers: `Service-Worker-Allowed: /`, `Cache-Control: no-store` on the SW file (via
  `next.config` headers and/or `proxy.ts`).
- New `/offline` App Router route — branded, design-system components, precached.
- Navigation strategy: NetworkFirst → `/offline` fallback on failure.
- SW registration in a client component mounted from `providers.tsx`, fully feature-detected.
- Stand up **Playwright** in `apps/web` (config + CI job) — SWs cannot run in jsdom/vitest.
  First e2e: offline navigation renders `/offline`.
- iOS: verify registration inside standalone; use a classic (non-module) SW build if Safari
  module-SW support is shaky on target versions.
- **Tests:** Playwright — offline nav → `/offline`; SW activates; precached shell loads offline.

### Chunk 3 — Runtime caching strategies

- Serwist runtime rules:
  - Fonts/static: CacheFirst + expiration.
  - Images: matched by `request.destination` + uploads path prefix + an **env-configured origin
    allowlist** (never a hardcoded host — see decision 3). CacheFirst, long `maxAgeSeconds` for
    content-addressed variants, `maxEntries` tuned lower on iOS, `cacheableResponse` 200 only.
  - RSC / navigation: NetworkFirst, short timeout, `/offline` fallback.
  - API GET: StaleWhileRevalidate, short TTL, **explicit allowlist of public/cacheable endpoints
    only** (feed, product detail, collections, public profiles). Never auth/`/api/auth/*`,
    never per-user private endpoints, never anything carrying `Authorization`.
- Logout: app posts a message to the SW to purge runtime caches; SW clears named caches.
- **Tests:** Playwright — image loads from cache offline; SWR revalidates on reconnect;
  logout empties runtime caches.

### Chunk 4 — SW update flow + lifecycle UX

- Detect `waiting` worker → design-system banner/`Toast`: "New version available — Reload".
- Controlled `skipWaiting` via `postMessage`; single reload on `controllerchange`.
- Suppress the prompt while an upload/checkout is in progress (shared "app busy" flag).
- Enable Navigation Preload on activate.
- Surface build id somewhere support can read it.
- iOS + Android: verify a cold reopen of the installed app picks up the new SW.
- **Tests:** Playwright — deploy v2 assets → banner → reload → v2 controls the page.

### Chunk 5 — Offline reads: React Query persistence

- Add `@tanstack/react-query-persist-client` + `idb-keyval` persister in `providers.tsx`.
- `persistQueryClient`: `buster` = build id, `maxAge`, and a **dehydrate allowlist** — only
  cache-safe queries (feed, explore, product detail, collections, public profiles). Exclude
  cart, checkout, auth, unread counts.
- Namespace the persisted store per user id; purge on logout and on user switch.
- `onlineManager` wired to `navigator.onLine` + `online`/`offline`; global "You're offline —
  showing saved content" banner (design-system).
- Request `navigator.storage.persist()` after install or after login; handle rejection.
- iOS: handle `persist()` auto-decline and IndexedDB-blocked (Lockdown/private) — run without
  persistence, no error.
- **Tests:** unit (dehydrate allowlist, logout purge, per-user namespacing); Playwright (load
  feed online → go offline → feed still renders from IndexedDB).

### Chunk 6 — API: push subscription store + module scaffold

- New `apps/api/src/modules/push/`: routes, controller, service, repository, schemas, types,
  `README.md`.
- Prisma `PushSubscription`: `userId`, `endpoint` (unique), `p256dh`, `auth`, `userAgent`,
  `platform`, `createdAt`, `lastSeenAt`, `failureCount`, `disabledAt`. Migration.
- Endpoints (all `requireAuth`, Zod-validated, write-rate-limited):
  - `POST /push/subscriptions` — upsert by `endpoint`.
  - `DELETE /push/subscriptions` — by `endpoint`.
  - `GET /push/public-key` — VAPID public key (or ship via build env).
- Env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Add `web-push` dep.
- No sending yet.
- **Tests:** integration (upsert dedupes by endpoint, auth required, rate limit trips);
  unit (schema).

### Chunk 7 — API: push delivery wired to notification events

- `push` module adds its **own consumer group** on the existing Redis Streams that in-app
  notifications consume (likes, follows, new looks, order status, CRM assignment, etc.).
- Event → push payload mapper: `title`, `body`, `icon`, `data.url` deep link, `tag` for
  coalescing, `renotify`.
- Send via `web-push` to every active subscription for the user, bounded concurrency.
  `404`/`410` → delete subscription. Repeated failure → set `disabledAt`. DLQ after retries
  (matches existing stream-consumer pattern).
- Preferences: migrate `notificationPreference` from a single `enabled` boolean to per-channel
  columns (`inAppEnabled`, `pushEnabled`, `emailEnabled`), plus a master push toggle and quiet
  hours — see decision 2. Suppress or delay a push when the recipient has a live socket.
- **Tests:** integration (event → `web-push` invoked per subscription; `410` prunes;
  preference opt-out suppresses); unit (event→payload mapper).

### Chunk 8 — Web: push opt-in UX + SW push handlers

- SW: `push` → `showNotification`; `notificationclick` → focus existing client or `openWindow`
  to `data.url`; update app badge.
- `features/pwa` client: permission state machine, `PushManager.subscribe` with the VAPID key,
  register/unregister with the API, unsubscribe on logout and on toggle-off.
- **Contextual** opt-in only — a card in the notifications feature + a settings toggle, never a
  prompt on load. Pre-permission explainer `Modal` before the native dialog.
- iOS: gate the entire opt-in on `display-mode: standalone` + iOS ≥ 16.4; in a Safari tab show
  "Add to Home Screen to enable notifications" with the instruction sheet. Require a user
  gesture for `subscribe()`.
- Android: standard flow; nudge install first (better push retention).
- App Badging: unread count → `setAppBadge` on push receipt and on in-app updates;
  `clearAppBadge` on read. Feature-detected.
- **Tests:** unit (permission state machine, iOS gating, subscribe/unsubscribe calls);
  Playwright (Android: grant → subscription POSTed; deny → graceful, no retry loop).

### Chunk 9 — Install experience (both platforms)

- Capture and stash `beforeinstallprompt` (Android/desktop); show a custom "Install Outfiqe"
  affordance at good moments (return visit, after a positive action); call `prompt()`; record
  outcome; dismissal cooldown in `localStorage`.
- iOS: detect iOS Safari non-standalone (incl. iPad) → "Add to Home Screen" instruction sheet
  with the share-icon visual.
- `appinstalled` → analytics, hide affordance, trigger `storage.persist()` and the push
  pre-prompt.
- `getInstalledRelatedApps` where available to stop nagging.
- Shared `isRunningStandalone()` util for other features.
- **Tests:** unit (prompt state machine, cooldown, platform branching); Playwright (Android
  install flow).

### Chunk 10 — Offline writes: background sync + queued mutations

- Serwist `BackgroundSyncPlugin` queue for an **allowlist of idempotent toggles**: like/unlike,
  follow/unfollow, save/bookmark, mark-notification-read.
- **Local look drafts:** persist the compose form + image blobs to IndexedDB so offline
  composition survives; publish still requires connectivity. This is not a queued mutation.
- **Deliberately excluded from v1:** checkout, payments, look publish, profile edits — stated
  exclusion, not an oversight. Those stay online-only. Comments are deferred to v2 (they need
  their own idempotency + pending-state design), not excluded on principle.
- **Queue mechanics:** collapse redundant ops by `(actionType, targetId)` keeping the last, and
  bound the queue (~100 actions / ~7 days, drop-oldest).
- Server: confirm each allowlisted endpoint is replay-safe (state-based upsert, not increment);
  add an idempotency key where the write isn't naturally idempotent. Document per endpoint in
  the module README.
- App layer: optimistic TanStack Query mutations + a persisted "pending actions" store
  (IndexedDB) so optimistic state survives reload; reconcile on replay — revert + `Toast` on a
  permanent 4xx.
- iOS/Safari drainer: a `syncPendingActions` routine run on `online` and on
  `visibilitychange` → visible. Same queue the SW drains on Android.
- Conflict policy: last-write-wins for toggles.
- **Tests:** integration (replayed like is a no-op, no double count); unit (queue drain,
  reconcile, revert); Playwright (offline like → reload → still liked → reconnect → server
  agrees).

### Chunk 11 — Share Target + outbound Share + Shortcuts + deep links

- Manifest `share_target` (Android) → `POST /share` route handler accepting `title`/`text`/
  `url` + image files → prefill look creation.
- Outbound `navigator.share` on look / profile / product; copy-link fallback (feature-detect).
  Reconcile with any existing share buttons.
- `shortcuts` targets must handle cold start in standalone.
- `launch_handler.client_mode: "navigate-existing"`.
- iOS: no `share_target` (documented); outbound share kept; shortcuts no-op.
- **Tests:** route handler unit (share payload → draft); unit (share fallback);
  Playwright Android share-target if the harness allows, else a manual checklist entry.

### Chunk 12 — Periodic Background Sync + freshness (progressive enhancement)

- Register `periodicSync` for `feed-refresh` + `notifications-refresh` when the
  `periodic-background-sync` permission is granted (Chromium, installed, engagement).
- SW handler revalidates a small critical cache set + updates the badge.
- No-op everywhere else (iOS, Firefox).
- Universal fallback: lightweight revalidate on app focus + `online` (partly from Chunk 5).
- **Tests:** unit (registration guarded by permission + `display-mode`); manual checklist for
  real periodic behavior.

### Chunk 13 — Storage management, resilience, telemetry, kill switch

- `navigator.storage.estimate()` surfaced; "Clear offline data" action in settings; trim image
  cache when near quota (Serwist expiration handles LRU; add the manual path).
- SW-side errors → Sentry (SW Sentry or `postMessage` to client); safe logging only.
- Every failure path degrades to a plain online app: SW registration failure, quota exceeded,
  IndexedDB blocked, `persist()` denied — no crash, no unhandled rejection.
- Kill switch: SW checks a platform feature-flag on activate; when off, it unregisters /
  skips precache and push.
- Analytics: `pwa_installed`, `sw_activated`, `offline_view`, `push_opt_in`/`push_opt_out`,
  `push_delivered` (server), `queued_action_replayed`/`queued_action_failed`.
- **Tests:** unit (degradation paths, kill-switch branch); integration (flag off suppresses
  push send).

### Chunk 14 — Cross-platform QA matrix + docs + Lighthouse gate

- `docs/TESTING-PWA.md`: device matrix — iPhone + iPad Safari (16.4 and latest), Android
  Chrome, Android Firefox, desktop Chrome/Edge/Safari — with a per-feature
  works / degrades / n-a table and manual scripts.
- Lighthouse CI (`@lhci/cli`) in CI: installability, offline, best-practices thresholds.
- Finalize `apps/web/src/features/pwa/README.md` (purpose, structure, user + technical funnel,
  non-obvious rationale: iOS gating, two-drainer queue, cache-safety allowlist, kill switch).
- Finalize `apps/api/src/modules/push/README.md`.
- Add the auto-memory pointer.

---

## Sequencing / parallelism

- **Web track:** 1 → 2 → 3 → 4 → 5 (mostly sequential; 3 and 4 can overlap).
- **API track:** 6 → 7 can start as soon as Chunk 1 lands, in parallel with the web track.
- **Chunk 8** needs 2 + 6 + 7. **Chunk 9** can run alongside 8.
- **Chunk 10** needs 3 + 5. **Chunk 11** needs 2. **Chunk 12** needs 5 + 10.
- **Chunk 13** after 8/10. **Chunk 14** last.

## Effort (dev-days, one engineer familiar with the codebase)

| Chunk | Days | Chunk | Days |
| ----- | ---- | ----- | ---- |
| 1     | 2–3  | 8     | 3–4  |
| 2     | 3–4  | 9     | 2–3  |
| 3     | 2–3  | 10    | 4–6  |
| 4     | 1–2  | 11    | 2–3  |
| 5     | 3–4  | 12    | 1–2  |
| 6     | 2–3  | 13    | 2–3  |
| 7     | 3–4  | 14    | 2–3  |

Total ≈ **34–50 dev-days** of focused work ≈ **7–10 weeks calendar** solo, allowing for review
cycles, the 80% coverage gate, and real-device iOS/Android QA. A meaningful first milestone
(Chunks 1–5) is ≈ **2–3 weeks** and delivers an installable, offline-reading app on both
platforms.

## Recommended calls on the five open decisions

These are recommendations, pending sign-off. Each states the reasoning so it can be argued with.

### 1. Offline-write allowlist

**Recommendation: agree with the proposal, with one addition and one explicit deferral.**

The rule that decides membership is not "is it a write" — it is: _is this operation
state-convergent, low-stakes if it lands ten minutes late, and free of a side effect the user
would be misled about if the replay later failed?_

| Operation                            | Call                                              | Why                                                                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| like / unlike                        | **Queue**                                         | Convergent toggle. Replay is a no-op. Delay is invisible.                                                                                                                                                                                                |
| follow / unfollow                    | **Queue**                                         | Same.                                                                                                                                                                                                                                                    |
| save / bookmark                      | **Queue**                                         | Same.                                                                                                                                                                                                                                                    |
| mark-read, mark-all-read             | **Queue**                                         | Idempotent by construction.                                                                                                                                                                                                                              |
| **local look drafts**                | **Add** — persist form + image blobs in IndexedDB | Not a queued mutation. Losing a composed look because the subway went dark is the single worst offline failure in a creator app, and it costs far less than queueing the publish itself.                                                                 |
| comments / replies                   | **Defer to v2, not excluded on principle**        | Genuinely queueable, but needs a client-generated idempotency UUID, a visible "pending" state, and a moderation answer for a comment that lands an hour into a changed thread. That is its own chunk, not a rider on this one.                           |
| look publish                         | **Online-only**                                   | Multi-asset upload through the image pipeline; Background Sync payload limits make "queue the publish" the wrong abstraction. The draft above covers the real user need.                                                                                 |
| checkout / payment / order placement | **Online-only, hard**                             | Price, stock, and payment authorization are all time-sensitive. A checkout that "succeeded" offline and fails on replay against sold-out stock is a refund and support problem, not a UX wrinkle. Block the pay button with an explicit offline message. |
| profile / settings / address edits   | **Online-only**                                   | Low frequency; last-write-wins on free-text fields is confusing rather than convenient.                                                                                                                                                                  |

Two queue mechanics that matter more than the allowlist itself:

- **Collapse redundant ops before replay.** `like → unlike → like` on the same target must drain
  as one `like`. Dedupe by `(actionType, targetId)`, keep the last. Without this, a flaky
  connection replays a burst that looks like abuse to your own rate limiter.
- **Bound the queue.** Max ~100 actions and max ~7 days age, drop-oldest. A device offline for a
  month should not wake up and flood the API.

### 2. Push categories

**Recommendation: evolve the existing table to per-type × per-channel. Do not reuse the current
boolean as-is, and do not build a parallel push-only prefs table.**

What exists today: `notificationPreference(userId, type, enabled)` — one mute switch per
`NotificationType`, enforced in the write path via `findMutedRecipientIds`
(`notification.service.ts`). That boolean currently conflates two different questions: _do I want
this notification at all_ and _through which channel_. The moment push exists, users want
"new followers in-app but don't buzz my phone" and "DM replies — push me." One boolean cannot
express that, and bolting a separate `pushPreference` table alongside it guarantees the two drift.

Add channel columns to the existing row:

```
notificationPreference(userId, type, inAppEnabled, pushEnabled, emailEnabled)
```

- Migration backfills from `enabled`: `enabled = false` → all channels off (preserves every
  existing mute); no row / `enabled = true` → in-app **on**, push **on**, email **off**
  (email is opt-in; never surprise people into it).
- The existing in-app path switches to `inAppEnabled`; the new push send path checks
  `pushEnabled`. One read, one settings screen, one source of truth.
- A row-per-`(userId, type, channel)` shape is more normalized and better if channels keep
  growing (SMS, WhatsApp, digests) — but it is more rows and a worse "give me all prefs" read
  for a channel set this small. Columns now; revisit if a fourth channel appears.

Two global switches that short-circuit before per-type is even consulted:

- **Master push toggle** — app-level, distinct from the OS permission, so a user can pause pushes
  without revoking permission (and without you having to re-prompt to resume, which on iOS you
  effectively cannot).
- **Quiet hours** (start, end, timezone). Optional for in-app, close to mandatory for push.

One delivery-side rule worth building in from day one: **do not push what the user is already
looking at.** If the recipient has a live socket connection, suppress or delay the push 30–60s and
cancel it if they acknowledge in-app. Also set a stable `tag` per (type, target) so anything that
does slip through collapses instead of stacking.

### 3. Image cache rule

What exists today: `STORAGE_DRIVER=local` → `LocalDiskStorageAdapter` serving from
`env.API_PUBLIC_URL`, and `apps/web` proxies `/api/*` to the API — so image URLs are effectively
**same-origin** right now. `packages/image-pipeline` ships an `R2StorageAdapter` **stub**,
reserving the seam for a Cloudflare R2 migration that will introduce a **distinct** CDN origin.

**Recommendation: do not key the rule on a hostname at all.**

- Match on `request.destination === "image"` **and** (uploads pathname prefix **or** an origin
  drawn from an env-configured allowlist). The R2 cutover then adds one env value and changes
  nothing else in the service worker. Hardcoding today's host guarantees a silent, total
  cache-miss the day storage moves.
- **Split immutable from mutable.** The pipeline's `avif`/`webp`/`jpeg` variants and thumbnails
  are content-addressed (key = checksum), therefore immutable: `CacheFirst`, `maxAge` 30–60 days,
  `cacheableResponse` 200 only. Never cache an asset still in `pending` state.
- **Tune `maxEntries` per platform, not globally.** ~300–500 is fine on desktop/Android;
  **cap iOS nearer 150**. Safari's per-origin quota is far smaller and eviction tends to drop a
  whole cache rather than trim it — an over-eager image cache there loses the app shell too.
- LQIP is already inline base64 from the pipeline, so it needs no caching and is what makes the
  offline feed feel instant. Keep it that way.

**One thing to confirm before Chunk 3 is written:** are look/product images served as **public
URLs or signed URLs**? The `StorageAdapter` interface exposes `getSignedUrl`. If images are
signed, the rule needs `cacheKeyWillBeUsed` to strip the signature query string from the cache
key — without it every load misses and the cache balloons with near-duplicates. If they are
public, this is a non-issue.

### 4. Branch strategy

**Recommendation: neither extreme — short-lived stacked branches, one PR per chunk, merged as
they pass, everything dormant behind a flag until launch.**

- A single long-lived `feat/pwa` with 14 commits becomes a multi-thousand-line PR nobody reviews
  properly, weeks of drift, and conflicts in exactly the hot files this touches
  (`providers.tsx`, `next.config.ts`, a Prisma migration, the notifications module).
- Fully independent per-chunk branches all targeting `main` means constantly rebasing chunk _N+1_
  on a chunk _N_ that has not merged yet.
- Stack them instead: `feat/pwa-manifest` → PR → merge; branch `feat/pwa-service-worker` off the
  new `main`; and so on. Each PR lands at roughly 200–500 reviewable lines.

What makes per-chunk merging safe is the gate, not the branching: put everything behind
`NEXT_PUBLIC_PWA_ENABLED` plus the Chunk 13 platform kill switch, so chunks 2–13 can sit in
`main`, inert, for weeks before the service worker ever registers for a real user. The API chunks
(6, 7) are independently shippable early — a `PushSubscription` table and a dormant consumer group
cost nothing in production.

Do not be dogmatic about the count: fold Chunk 4 into 2 and Chunk 12 into 13 if the standalone PRs
would be trivial. Ten good PRs beat fourteen ceremonial ones.

### 5. Lighthouse CI thresholds

**Recommendation: hard-fail on the stable, binary things; warn on the noisy ones.** Lighthouse
performance scores drift ±3–5 points run to run in CI. Gating hard on a performance number
produces flaky builds, and flaky gates get disabled — at which point you have no gate at all.

**Hard-fail (`error`):**

| Assertion                                                                                 | Threshold            |
| ----------------------------------------------------------------------------------------- | -------------------- |
| `installable-manifest`, `service-worker`, `viewport`, `apple-touch-icon`, `maskable-icon` | pass                 |
| `is-on-https`, `redirects-http` (prod profile)                                            | pass                 |
| `errors-in-console`                                                                       | 0                    |
| `categories:accessibility`                                                                | ≥ 0.95               |
| `categories:best-practices`                                                               | ≥ 0.95               |
| `categories:seo`                                                                          | ≥ 0.95               |
| Total JS (landing route)                                                                  | ≤ 300–350 KB gzipped |
| Total page weight                                                                         | ≤ 1.6 MB             |
| `unused-javascript`                                                                       | ≤ 150 KB             |

Set the byte budgets from your **current measured values + ~10% headroom**, not from these
abstract numbers — measure once in Chunk 1, then freeze. Version them in a `budget.json`.

**Warn only (`warn`), never blocking:** `categories:performance` ≥ 0.85 mobile / ≥ 0.95 desktop;
LCP ≤ 2500 ms; TBT ≤ 200 ms; CLS ≤ 0.1.

**Runner config:** `numberOfRuns: 3` and take the median (this alone removes most of the flake).
Test three representative public URLs — landing, explore/feed, and a product detail page (the
heaviest, image-wise) — rather than `/` alone; do not attempt authenticated routes in Lighthouse
CI. Mobile preset (Moto G4 / slow 4G) is the profile that matters for a PWA; run desktop as a
secondary, non-gating profile.

**Ratchet:** keep performance warn-only for the first month, watch the median, then promote it to
a hard gate at _(observed median − 3)_.
