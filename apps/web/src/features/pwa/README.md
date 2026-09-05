# PWA

## Purpose

This is what makes the web app installable on a phone and keeps it usable when the connection
drops. It owns the app icons, the launch screens iPhone shows while the app opens, the home screen
shortcuts, the browser theme colour, the Apple-specific tags iOS needs, and the service worker that
saves pages for offline use.

All of it is kept in one place so the manifest, the page head, and the script that generates the
image files can never disagree about which icons exist. `app/layout.tsx` pulls the metadata into the
page's `metadata` and `viewport`, and `app/providers.tsx` mounts the service worker registration.

The rest of the offline work — saving data for offline reading, push notifications, queuing actions
made while offline — is planned in `docs/PLAN-PWA.md` and will live here too.

## Switching it on

Everything to do with the service worker is behind `NEXT_PUBLIC_PWA_ENABLED`. Unless it is set to
`true` at **build** time, no worker is registered and the app behaves exactly as it did before.

It is a `NEXT_PUBLIC_` variable, so its value is baked in when the app is built, not read when the
server starts. Setting it only at runtime does nothing.

## Structure

- `constants/appIcons.ts` — which icons exist (192 and 512 pixels, in both normal and maskable
  form), the Apple icon size, the maskable safe area, and how a file name is built from those.
  Nothing anywhere else should ever write an icon file name by hand.
- `constants/appleSplashScreens.ts` — the list of iPhone and iPad screen sizes we ship launch
  images for, and how those file names are built.
- `constants/appShortcuts.ts` — the shortcuts that appear when you long-press the app icon.
- `constants/appTheme.ts` — the light and dark theme colours, copied from `--background` in
  `packages/design-system/tokens.css` so the app bar matches the app.
- `constants/appMetadata.ts` — the icon, Apple, and manifest parts of the page head.
- `constants/serviceWorker.ts` — where the worker is served from, the scope it claims, the name of
  the cache holding visited pages, and the address of the offline page. Shared by the app and by
  the worker itself, so the two can never point at different places.
- `constants/pwaFeatureFlag.ts` — reads `NEXT_PUBLIC_PWA_ENABLED`. Kept separate from
  `serviceWorker.ts` because the worker bundle has no `process.env` and would crash on it.
- `constants/runtimeCaching.ts` — cache names, how long things are kept, and how many of each are
  kept. iPhone gets lower limits than everything else.
- `constants/privatePaths.ts` — the pages that must never be saved to disk, and the check for them.
- `constants/serviceWorkerMessages.ts` — the message the app sends the worker to forget everything.
- `constants/updatePrompt.ts` — the pages where the "new version" prompt must not appear.
- `constants/offlineCache.ts` — which loaded data may be written to the browser database, how long
  it is kept, and the version to bump when a saved shape changes.
- `constants/pushMessage.ts` — the shape of the payload the server sends with a push, and a safe
  fallback for anything malformed.
- `constants/pushOptIn.ts` — remembers, per browser, that someone dismissed the "turn on
  notifications" bar so it does not come back every visit.
- `constants/installPrompt.ts` — how many visits before the install bar is worth showing, and how
  long it stays quiet after someone dismisses it.
- `utils/standalone.ts` — whether the app is running as an installed app, whether the browser is
  on iOS, and whether it can do web push at all.
- `utils/pushClient.ts` — fetches the push key, subscribes the browser, registers the subscription
  with the API, and unsubscribes.
- `utils/installPromptStore.ts` — captures the browser's own install prompt when it fires,
  replays it on demand, and counts the visit that just happened.
- `utils/appBadge.ts` — sets or clears the number on the installed app icon.
- `hooks/usePushSubscription.ts` — the small state machine behind the opt-in: not-asked, blocked,
  needs-install, enabled, and the transient enabling/failed states.
- `hooks/useInstallPrompt.ts` — the small state machine behind the install bar: hidden, a real
  browser install to offer, or the iOS instructions instead.
- `components/PushNotificationPrompt.tsx` — the dismissible bar and the explainer that runs before
  the browser's own permission prompt.
- `components/InstallPrompt.tsx` — the "Install Outfiqe" bar, and the Add to Home Screen steps
  shown in its place on an iOS browser tab.
- `components/AppBadgeSync.tsx` — keeps the app-icon number in step with the unread count while
  the installed app is open.
- `utils/queryPersister.ts` — saves and restores that data, and forgets it on sign out.
- `utils/requestPersistentStorage.ts` — asks the browser not to throw saved content away.
- `hooks/useIsOnline.ts` — whether there is a connection right now.
- `utils/imageHosts.ts` — works out which hosts serve uploaded photos.
- `utils/clearCachedContent.ts` — asks the worker to forget saved pages and photos. Used on sign
  out.
- `utils/manifestIcons.ts` — turns the icon list into the manifest's format.
- `utils/appleSplashMedia.ts` — builds the media query that picks one launch image for one device.
- `utils/appViewport.ts` — the page's `viewport`, including the theme colour for light and dark.
- `components/AppleSplashLinks.tsx` — puts one launch image link in the page head per device.
- `components/ServiceWorkerProvider.tsx` — registers the worker, or does nothing when the flag is
  off.
- `components/OfflineRetryButton.tsx` — the "Try again" button on the offline page.
- `components/AppUpdatePrompt.tsx` — the "A new version is ready" bar, and the reload it triggers.
- `components/OfflineBanner.tsx` — the "You're offline" strip, so nobody mistakes saved content for
  live content.
- `components/PersistentStorageRequest.tsx` — makes the storage request once, on load.

Outside this folder:

- `app/sw.ts` — the service worker itself. It is not part of the app bundle; it is compiled
  separately (see below).
- `app/serwist/[path]/route.ts` — compiles `app/sw.ts` and serves it at `/serwist/sw.js`.
- `app/offline/page.tsx` — the page shown when someone opens a page we have not saved.
- `tsconfig.sw.json` — type-checks the worker on its own, because it runs in a worker, not in a
  browser tab, and so has a completely different set of globals.

The image files live in `public/icons/` and `public/splash/` and are generated by
`apps/web/scripts/generate-pwa-assets.mts`:

```bash
pnpm --filter @outfiqe/web generate:pwa-assets
```

Run that and commit the output whenever `public/logo.svg` changes, or whenever an icon size or a
device is added to the lists above.

## How it works

**What the user sees.** On Android, the browser reads the manifest and offers to install the app. On
iPhone the user taps Share and then Add to Home Screen, and gets the right icon and a branded launch
screen. Once the app has been opened, its pages are saved as they are visited. Going back to a page
already seen works with no connection. Opening a page never visited shows a branded "You're offline"
page instead of the browser's error page.

**What the code does.** `app/manifest.ts` builds the manifest from the icon and shortcut lists.
`app/layout.tsx` adds the Apple tags and launch-screen links. `app/providers.tsx` wraps the app in
`ServiceWorkerProvider`, which registers `/serwist/sw.js` at the root scope when the flag is on.

The worker is built by a normal Next route handler rather than by a bundler plugin. When the app is
built, `app/serwist/[path]/route.ts` runs esbuild over `app/sw.ts`, injects the list of files to
save, and writes the result out as a static file. Next.js 16 builds with Turbopack, and the older
plugin-based approach only worked with webpack.

The worker saves every page it serves into a `visited-pages` cache and tries the network first, so
people always get fresh content when they have a connection and the saved copy when they don't.

## What gets saved, and what never does

| Request                                                                      | What happens                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| The app itself (JavaScript, styles, icons)                                   | Saved when the worker installs                                                       |
| A public page (home, shop, explore, a product)                               | Fetched fresh, saved as a backup, served from the backup when there is no connection |
| A private page (cart, checkout, orders, wallet, messages, settings, sign-in) | Fetched fresh, **never saved**. With no connection the offline page is shown instead |
| An uploaded photo                                                            | Served from disk once seen, kept for 30 days                                         |
| Anything under `/api/`                                                       | **Never saved**                                                                      |
| The iPhone launch images                                                     | Never saved — the phone reads them from disk at launch                               |

Signing out, or a session expiring, tells the worker to forget every saved page and photo.

Which hosts count as photo hosts is worked out at build time from `NEXT_PUBLIC_IMAGE_HOSTS` (a
comma-separated list) plus the API origin. Nothing is hard-coded, so moving photos to Cloudflare R2
later is a config change rather than a code change. If neither is set, photos are simply not saved
and the app carries on.

## Reading content offline

Saving pages covers anything the server rendered. It does not cover data the browser fetched
afterwards — scrolling further down a feed, opening a product, and so on. That data lives in
TanStack Query, so we write its cache to the browser's own database and read it back on start-up.
Opening the app with no connection then shows real content instead of empty loading skeletons.

Only data on an explicit allowlist is ever written (`constants/offlineCache.ts`): products,
categories, the explore feed, looks, a brand's products, and the creator leaderboard. Everything
else is skipped. Failed requests are skipped too, so a page cannot get stuck showing an error it
saved earlier.

Saved data is kept for a day and thrown away on sign out or when a session expires, at the same
moment the saved pages and photos are.

## How a new version reaches people

Once someone has the app saved, they keep running the version they downloaded until the worker is
replaced. Without a prompt they could sit on an old version for weeks.

When we deploy, the browser fetches the new worker and parks it as "waiting". The app notices,
shows a small bar saying a new version is ready, and offers Reload or Later. Reload tells the
waiting worker to take over, and the page reloads itself once it has.

Nothing reloads on its own. The bar also never appears while someone is on the cart, checkout, or
payment pages, where a mis-tap costs real money or work.

## The install prompt

Rather than let the browser show its own install banner at a random moment, the app keeps its own
bar and shows it once someone has visited enough times to make installing worth suggesting.
Dismissing it is remembered per browser, so it does not come back for two weeks.

On Android and desktop Chrome, the browser fires `beforeinstallprompt` ahead of time and hands over
an object that can show its own install dialog later; `utils/installPromptStore.ts` captures that
event the moment it fires (`event.preventDefault()` stops the browser's own banner from also
appearing) and holds onto it until the bar's "Install" button asks for it. iPhone never fires that
event at all — Safari has no install API to hand over — so there `hooks/useInstallPrompt.ts` falls
back to a short "tap Share, then Add to Home Screen" panel instead of a button that could not work.

`e2e/installPrompt.spec.ts` proves both paths for real: dispatching a fake `beforeinstallprompt`
event with a stubbed `prompt`/`userChoice` (this part of the API is just a normal DOM event our own
code reacts to, unlike the Notifications permission below, so it genuinely can be driven from a
test) and confirming the browser's own install call actually runs, plus a real iOS user agent to
confirm the Add to Home Screen steps appear instead.

## Turning on push notifications

When a signed-in person has been using the app, a small bar offers to turn on notifications.
Tapping it opens a short explainer, and only then does the browser's own permission prompt appear.
Dismissing the bar is remembered per browser, so it does not come back every visit.

On iPhone this is only possible once the app is installed to the Home Screen, so an iPhone user
still in a Safari tab sees a "install first" message instead of a button that could not work.
If notifications were blocked earlier, the bar explains where to turn them back on rather than
showing a dead button.

Turning it on subscribes the browser with `PushManager`, using the key from `GET /api/push/public-key`,
and registers the subscription with the API. The service worker's `push` handler shows the
notification; its `notificationclick` handler focuses an open tab (or opens one) at the page the
notification points to.

While the installed app is open, the number on its icon is kept in step with the unread count. The
service worker also marks the icon when a push arrives while the app is closed, so there is
something there before the app is next opened.

Once a browser has an active subscription, the bell's own settings panel gains a second column —
each notification type can be left in the bell but turned off on the phone, or vice versa. That
column is `showPushChannel` on the shared `NotificationBell`/`NotificationPanel`
(`packages/components`), which `SiteNotificationBell` only turns on once `usePushSubscription`
reports `"enabled"`. Admin, and any web session that has not turned push on, still sees the plain
single-column preferences it always has.

`e2e/pushNotification.spec.ts` delivers a real push through Chrome DevTools Protocol
(`ServiceWorker.deliverPushMessage`) against the actual built worker, for both a well-formed
payload and a malformed one, and checks that each one reaches the browser's own
"no notification permission" rejection inside `showNotification` — proving the `push` listener
fired and got that far without throwing on its own first. It cannot go further than that here:
granting the Notifications permission through Playwright — `context.grantPermissions`,
`Browser.grantPermissions`, and `Browser.setPermission` were all tried — never moves
`Notification.permission` off its default in this Chromium build, so no automated test in this
repo can watch a real notification appear. What the notification actually says is covered instead
by `constants/pushMessage.test.ts` (unit-level, the same `parsePushMessage` the worker runs) and by
the API's own `push.messages.test.ts` for the title/body/url/tag the server sends in the first
place. Worth knowing if this ever needs re-verifying by hand: install the app, subscribe, and
trigger a real notification from a running API with VAPID keys set.

## Things that are not obvious

**The offline-reading allowlist is a list of what may be saved, never a list of what may not.** A
"don't save these" list fails open: the day someone adds a query for saved addresses or payout
details, it is written to disk because nobody remembered to add it. An allowlist fails closed — a
new query is private until someone deliberately says otherwise.

**The allowlist is checked again on the way back out of storage, not only on the way in.**
`shouldPersistQuery` gates what this app ever writes, but nothing about the persistence library
stops it from restoring and rendering _whatever happens to already be sitting_ in that IndexedDB
key — an older build with a wider allowlist, or anything else that landed there. `restoreClient`
in `queryPersister.ts` filters the restored queries through the same `isPersistableQueryKey` check
before handing them back, so the guarantee holds in both directions. `e2e/offlineReading.spec.ts`
proves both halves against a genuinely killed server: a real page render from a save-shaped seed,
and a seed placed directly in storage — bypassing the app's own write path entirely — that still
never reaches the screen.

**The saved-data version has to be bumped by hand.** `PERSISTED_CACHE_VERSION` is what tells
browsers to throw away everything saved. If a saved query's shape changes, bump it, or people
carrying old data will get it restored into a UI that no longer understands it.

**Asking the browser to keep our data usually fails on iPhone, and that is fine.** Safari decides
for itself and generally says no. The request is made once, the answer is ignored, and everything
still works — the data is simply more likely to be discarded when the phone is short of space.

**The update prompt only reloads when the user asked it to.** The worker takes control on a first
install too, not just on an update, so reloading whenever it takes control would refresh the page
under everyone's feet the first time they ever open the app. The prompt therefore remembers whether
the person actually pressed Reload, and ignores the takeover otherwise.

**The push permission state is read through `useSyncExternalStore`, not a `useState` set in an
effect.** The ESLint config forbids the second pattern, and permission really is an external thing
that can change out from under the app (someone flips it in browser settings). The store subscribes
to the Permissions API `change` event where it exists; a separate transient state covers the
"asking now" and "that failed" moments that the browser's own permission value does not represent.

**The opt-in is a dismissible bar, not a modal on load.** A modal the moment the app opens is how
people end up blocking notifications forever. The bar only shows to a signed-in user, only after
the base state says it is worth asking, and only until they dismiss it once.

**The install bar sits above the push bar on purpose.** Both are fixed bars pinned to the same
spot, and on an iPhone Safari tab the two can genuinely want to appear at once — the push bar's own
"add to Home Screen to turn on notifications" message covers ground the install bar also covers.
Rather than couple the two features together to suppress one, the install bar is given the higher
`z-index`, so on the rare overlap it is what is visible — correctly, since installing is what has
to happen first on iPhone either way, and doing so removes the push bar's needs-install state on
its own. The same layered-but-uncoordinated approach was already accepted between the update
prompt and the push bar; this follows it rather than inventing a different fix for one more pair.

**`beforeinstallprompt` is a real DOM event our own code reacts to, not a genuine browser
capability check.** Unlike the Notifications permission (see below), the browser does not gate
whether this event can be dispatched from a test — it is just `window.dispatchEvent` with a plain
object shape. That is what makes `e2e/installPrompt.spec.ts` able to prove the real install button
end to end, in a way `pushNotification.spec.ts` cannot for the permission prompt.

**A visit is counted once per full page load, not once per feature check.** `installPromptStore.ts`
records it as a side effect of the module loading, alongside registering the
`beforeinstallprompt`/`appinstalled` listeners — the same place, because both only need to happen
once per session and neither belongs in a component effect for something that never changes while
the page is open.

**The app-icon number is set from two places.** While the app is open, `AppBadgeSync` keeps it
exact against the unread count. While the app is closed, only the service worker runs, and it
cannot know the count, so its `push` handler just marks the icon. The next time the app opens,
`AppBadgeSync` corrects it to the real number.

**The service worker deliberately does not cache API responses at all.** Serwist's default rules
save every same-origin `/api/` GET, which would put one person's cart, orders, and messages on disk
and risk serving them after they sign out. Rather than maintain a list of which endpoints happen to
be safe — a list that silently rots as endpoints gain personalised fields — nothing under `/api/` is
saved. Very little is lost, because pages are rendered on the server, so a saved page already
contains its content. Offline access to data fetched by the browser is a separate piece of work
that can scope it per account properly.

**Private pages are excluded by path, not by guessing.** `constants/privatePaths.ts` is the single
list. It looks similar to the "don't index this" list in `shared/seo/routes.ts` but is deliberately
separate: one is about search engines, the other about what may be written to a user's disk, and
they should be free to differ.

**iPhone gets smaller limits on purpose.** Safari gives each site far less room and tends to throw
away a whole cache at once rather than trimming the oldest entries — which would take the saved app
with it. Fewer saved photos and pages makes hitting that limit much less likely.

**We handle page navigations ourselves instead of using Serwist's `fallbacks` option.** The built-in
option looked like the obvious fit, but it does not work here: it only attaches its fallback to
caching rules that do not already have an error handler, and the way the default Next.js rules are
put together means the offline page was never served. This was confirmed against a real dead server
— the browser showed its own network error. So the worker registers its own navigation rule, first
in the list, with an explicit fallback that looks the offline page up in the cache. If you replace
that rule, test it against a genuinely stopped server, not just an "offline" toggle.

**Playwright's offline switch does not test offline.** `context.setOffline(true)` makes the
navigation fail before the service worker is ever asked, so the worker cannot fall back and the test
passes or fails for the wrong reason. `e2e/offlineFallback.spec.ts` therefore starts its own server
and stops it, which is the only way to reproduce what a user actually experiences.

**The worker is compiled as a classic script, not a module.** Module workers need Safari 16.4,
Firefox 111, or Chrome 91. Compiling as a classic script means offline support also reaches people
on older phones, and costs nothing, because the worker is bundled into a single file anyway.

**The page never reloads itself when the connection returns.** Serwist reloads by default. On a
flaky connection that would throw away a half-finished form or interrupt an upload, so it is turned
off. Handling new versions properly is planned separately.

**Launch images are left out of the saved files.** They are 360 KB the browser would download on
install and never use — the phone reads them from disk at launch, not through the worker.

**`start_url` and `id` are different on purpose.** `start_url` is `/?source=pwa` so we can tell in
analytics when someone opened the installed app rather than the website. `id` stays as `/`, because
that is what browsers use to recognise the app — if we ever change that query string, existing
installs still update instead of being treated as a brand new app.

**Launch images are portrait only.** Supporting landscape too would double 13 image files to 26 for
a shopping app people hold upright. Opening in landscape shows the plain background colour instead.

**The maskable icon is a different image, not just a smaller one.** Android crops app icons into
whatever shape the phone uses and throws away anything outside the middle 80%. So the generator
draws the logo smaller on a full square of background colour.

**Icons moved out of `shared/seo`.** They describe the installed app, not the search result, and
keeping them next to the icon list is what lets the manifest, the Apple icon, and the generator
share one list.

## To do later

- The manifest can include screenshots, which make Android's install dialog show a preview of the
  app rather than just an icon. These need real pictures of the running app and can be captured
  with the browser tests now that they exist.
- One JavaScript chunk is over 3 MB and is too big to be saved for offline use, so the first visit
  to a page needing it will not work offline. It is saved normally once downloaded. The chunk is
  worth splitting up regardless of offline support.
