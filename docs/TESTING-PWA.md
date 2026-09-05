# Outfiqe PWA — Device Test Plan

Covers everything built across the PWA effort: installability, the offline layer (saved pages,
saved data, the offline page), push notifications, the install and notification prompts, sharing
into and out of the app, background refresh, and the emergency off switch. The full written
rationale for each piece lives in `apps/web/src/features/pwa/README.md`; this doc is the checklist
someone walks on real hardware before the feature is turned on for users, and again after any
change to the `pwa` feature.

Most of this is also guarded automatically in CI (see "What CI already checks" at the end) — but an
install, a real Home Screen icon, a notification actually arriving, and a share sheet actually
opening can only be confirmed by hand on a real phone.

## Getting a test build

The feature is behind `NEXT_PUBLIC_PWA_ENABLED`, which is baked in at build time. Nothing below
works against a build made without it.

```bash
NEXT_PUBLIC_PWA_ENABLED=true \
API_URL=<your api> ADMIN_ORIGIN_URL=<your admin> SITE_URL=<this build's url> \
pnpm --filter @outfiqe/web build
pnpm --filter @outfiqe/web start
```

Serve it over **HTTPS** on a real domain (a tunnel to localhost is fine) — iOS and the install
prompt both need a secure origin, and `localhost` alone won't let you test from a phone. Point it
at an API with real catalog and creator data, or every page is just empty states.

## What should happen on each device

| Device                | Install                                                          | Offline                                                 | Push                               | Share target  | Background refresh                   |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------- | ------------- | ------------------------------------ |
| iPhone (Safari)       | Manual: Share → Add to Home Screen. Our own bar shows the steps. | Works for pages already visited; offline page otherwise | Only after it's on the Home Screen | Not supported | Refresh on open only                 |
| iPad (Safari)         | Same as iPhone                                                   | Same as iPhone                                          | Same as iPhone                     | Not supported | Refresh on open only                 |
| Android (Chrome)      | Our "Install Outfiqe" bar, then Chrome's own dialog              | Same, with higher storage limits                        | Full support once permitted        | Supported     | Supported once Chrome trusts the app |
| Android (Firefox)     | Firefox's own "Install" menu item                                | Same as Chrome                                          | Full support once permitted        | Not supported | Not supported                        |
| Desktop (Chrome/Edge) | Install icon in the address bar                                  | Works for visited pages; offline page otherwise         | Full support once permitted        | Not supported | Not supported                        |

"Refresh on open only" and the unsupported cells are not bugs — those platforms don't have the
API, and the app is built to fall back to working normally, never to show an error.

## iPhone (Safari)

- [ ] Visit the site a couple of times in a Safari tab — after the second visit, the **"Install Outfiqe"** bar appears with "tap Share, then Add to Home Screen" steps (not a button — Safari has no install API).
- [ ] Dismiss the bar — it stays gone for two weeks, across new tabs.
- [ ] Add to Home Screen — the icon is the Outfiqe icon (not a screenshot of the page), and opening it shows a branded launch screen sized to this device, then the app with no Safari chrome.
- [ ] In the installed app, open a few pages, then turn on Airplane Mode and reopen those same pages — they load from the saved copy.
- [ ] Still offline, open a page you never visited — the branded **"You're offline"** page appears, not Safari's error.
- [ ] Still offline, open the app fresh — the feed shows real saved content, not empty loading skeletons.
- [ ] Back online, sign in, and confirm the **"turn on notifications"** bar appears; tapping it explains you must add to Home Screen first if you're still in a tab, or (in the installed app) opens the explainer then the real iOS permission prompt.
- [ ] With notifications on, trigger one (a like/follow/order from another account) — it arrives on the lock screen, and tapping it opens the app at the right page.
- [ ] Rotate to landscape while opening the installed app — it shows the plain background colour, not a broken layout (launch images are portrait only, on purpose).

## iPad (Safari)

- [ ] Repeat the iPhone list. The launch image should match an iPad size, and the app should use the iPad's full width rather than a phone-width column.

## Android (Chrome)

- [ ] Visit twice — the **"Install Outfiqe"** bar appears with a working **Install** button; tapping it opens Chrome's own install dialog.
- [ ] Confirm the install dialog shows the app name, icon, and (once real screenshots are captured — see go-live) a preview, not just an icon.
- [ ] Install, open from the launcher — branded splash, no browser chrome, correct icon shape (Android crops to its own mask — the icon should still look right, not clipped).
- [ ] Open several pages, enable Airplane Mode, reopen them — served from cache. Open an unvisited page — the offline page.
- [ ] Offline cold start — real saved content, no skeletons.
- [ ] Turn on notifications, trigger one from another account — it arrives, tap opens the right page. Send a second of the same type — it replaces the first rather than stacking.
- [ ] While the app is open, the launcher icon shows the unread count; close it, trigger a notification, and confirm the icon is marked before you next open the app.
- [ ] From another app (Photos, say), use the system share sheet and pick Outfiqe — a **New post** screen opens with that photo already staged.
- [ ] Share plain text (no image) to Outfiqe — it still opens the compose screen, just with nothing staged, no error.
- [ ] Use the app across a few days, then check (via `chrome://serviceworker-internals` or the network log) that the feed quietly fetched in the background with no tab open. This one depends on Chrome's own engagement heuristics and can't be forced.
- [ ] Long-press the installed icon — the Shop / Explore / Search / Wishlist shortcuts appear and each opens the right page.

## Android (Firefox)

- [ ] Firefox's menu offers **Install** — install it, open it, confirm icon and standalone display.
- [ ] Offline: visited pages load from cache, unvisited shows the offline page, cold start shows saved content.
- [ ] Notifications: turn on, trigger one, confirm arrival and tap-through.
- [ ] Confirm the share-target and background-refresh items simply don't appear / don't run, and nothing errors because of it.

## Desktop (Chrome / Edge)

- [ ] The address-bar install icon appears after a couple of visits (or our bar, whichever the browser allows).
- [ ] Install, open the standalone window — correct icon and title, no tab strip.
- [ ] DevTools → Application → Service Workers shows one active worker at scope `/`.
- [ ] DevTools → Network, tick "Offline", reload a visited page — it loads; navigate to an unvisited page — the offline page.
- [ ] Application → Manifest shows no errors, lists the icons, and (post go-live) the screenshots.

## Cross-cutting — do these on at least Android Chrome and desktop

- [ ] **Update prompt:** deploy a change, reopen the installed app — a small "new version is ready" bar appears with Reload / Later. Reload swaps the version and reloads once; Later leaves it. The bar never appears on the cart, checkout, or payment pages.
- [ ] The app never reloads itself when the connection comes back mid-form.
- [ ] **Clear offline data:** sign in, go to Settings → Security → **Offline data**, tap **Clear offline data** — a success toast shows, and afterwards DevTools shows the `visited-pages` / image caches and the persisted query database emptied. The app keeps working.
- [ ] **Sign out** — confirm the same caches and database are cleared automatically.
- [ ] **Emergency off switch:** set `PWA_KILL_SWITCH=true` in the server environment and restart (no rebuild). Load the app again on a device that already had the worker installed — within that one load, DevTools shows the service worker unregistered and all caches gone, and the install prompt / offline behaviour no longer happen. Unset it and restart — the worker comes back on the next visit.

## Performance — "has it gotten slower?"

- [ ] Run Lighthouse (mobile preset) against the home page and one product page on the test build, and compare the Performance score and LCP / TBT against the previous release's numbers. A few points of noise is fine; a 10+ point drop or a clearly worse LCP needs a look before shipping.
- [ ] CI runs Lighthouse against the app shell (`/offline`) on every PR (the **Lighthouse** check) — treat a new warning there as a regression in the shell's own weight.

## Before turning it on for users (go-live)

- [ ] **Capture real screenshots.** Against a deployed environment with real catalog data, run `pnpm --filter @outfiqe/web capture:pwa-screenshots` (set `SCREENSHOT_BASE_URL` to that environment). Review the PNGs in `apps/web/public/screenshots/`, commit them, and redeploy — the manifest picks them up automatically and Android's install dialog then shows a real preview.
- [ ] Walk this whole checklist on at least one real iPhone and one real Android device.
- [ ] Confirm the Lighthouse numbers haven't regressed from the last release.
- [ ] Resolve the Vercel deploy blocker (the private-org / plan issue) so preview and production deploys work.
- [ ] Set `NEXT_PUBLIC_PWA_ENABLED=true` in the production environment and deploy. This is the switch that turns the whole thing on for real users — everything above is inert until it's set.
- [ ] After go-live, keep an eye on Sentry for anything tagged `source: "service-worker"`.

## What CI already checks

The **Browser tests** job (Playwright, real compiled worker) covers, on every PR:

- `installable.spec.ts` — the manifest still carries every field a browser checks before offering to install, both the 192 and 512 icons resolve, a worker registers and takes control, and every advertised screenshot is actually served.
- `manifest.spec.ts` — manifest fields, `any` + `maskable` icons reachable, shortcuts resolve, the Apple touch icon and at least one iPhone launch image resolve.
- `serviceWorker.spec.ts` — the worker is served at root scope, precaches the offline page, registers and controls the page, never caches an `/api/` response, and does cache pages it has served.
- `offlineFallback.spec.ts` / `offlineReading.spec.ts` — against a genuinely stopped server: the offline page is served for an unvisited route, and saved data is restored and rendered (and data outside the allowlist never is).
- `pushNotification.spec.ts` — a real push payload reaches the worker's `showNotification` (the permission itself can't be granted through automation, so the notification appearing on screen is manual only).
- `shareTarget.spec.ts` — the worker stashes a shared photo and redirects; a fieldless share still redirects cleanly.
- `backgroundRefresh.spec.ts` — registering periodic background sync never throws in a browser that doesn't support it (the event itself can't be fired from automation).

The **Lighthouse** job runs three Lighthouse passes against `/offline` and fails only on
deterministic regressions (unminified JS/CS, an accessibility or best-practices drop); performance
and byte-weight changes are warnings.
