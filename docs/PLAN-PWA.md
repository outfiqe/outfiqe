# Turning the web app into a PWA

## What we are building

We are turning `apps/web` into a Progressive Web App — an app people can install on their phone
from the browser, open from their home screen, and keep using when the connection drops.

When this is finished, a user will be able to:

- Install Outfiqe on Android, iPhone, iPad, or desktop, and open it from the home screen.
- Keep browsing looks and products they have already seen, even with no internet.
- Get push notifications on their phone when someone likes, follows, or messages them.
- Like, follow, and save things while offline, and have those actions sent once they reconnect.
- Share a photo from their phone's share sheet straight into Outfiqe.

The admin app is not part of this. At most it becomes installable later; it has no offline needs.

Everything here must work on both **iPhone and Android**. The two platforms do not support the
same features, so every feature checks first whether the browser can do it. If it cannot, the app
quietly does without it. Nothing ever breaks because a feature is missing.

---

## The main choices we made

| Topic                    | What we chose                                                            | Why                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service worker tool      | `@serwist/turbopack`                                                     | Next.js 16 builds with Turbopack. The older `@serwist/next` hooks into webpack, which Turbopack does not use. `@serwist/turbopack` avoids the bundler entirely and builds the service worker through a normal route handler. `next-pwa` is abandoned. |
| App manifest             | The existing `apps/web/src/app/manifest.ts`                              | Already there, already typed, and there is no separate file to fall out of date.                                                                                                                                                                      |
| Offline reading          | `@tanstack/react-query-persist-client` with `idb-keyval`                 | TanStack Query already holds all the app's data. Saving its cache to the browser's database is far better than inventing a second store.                                                                                                              |
| Offline actions          | A queue that two different things can empty                              | Android can empty the queue in the background. iPhone cannot, so the app empties the same queue itself when it comes back online. One queue, two ways to drain it.                                                                                    |
| Push notifications       | A new `apps/api/src/modules/push/` reading the events we already publish | The app already sends likes, follows, and new looks through Redis Streams. Push reads the same stream with its own consumer group, so it cannot interfere with in-app notifications.                                                                  |
| Push sending             | `web-push` with VAPID keys                                               | The standard way. No third-party service, no lock-in, no per-message cost.                                                                                                                                                                            |
| Where the web code lives | `apps/web/src/features/pwa/`                                             | Matches how every other feature is organised.                                                                                                                                                                                                         |
| Emergency off switch     | The existing platform feature-flag system                                | If something goes wrong in production we can turn the service worker and push off without a deploy.                                                                                                                                                   |

---

## What each phone can actually do

This table is the reason the work is shaped the way it is. iPhone is missing several things
Android has, so we plan around it from the start rather than discovering it late.

| Feature                                  | Android Chrome | iPhone (installed)                             | iPhone (Safari tab)      | What we do when it is missing                           |
| ---------------------------------------- | -------------- | ---------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| "Install app" browser prompt             | Yes            | No                                             | No                       | Show our own "Add to Home Screen" instructions          |
| Service worker                           | Yes            | Yes                                            | Yes                      | App works online only                                   |
| Push notifications                       | Yes            | Yes, iOS 16.4+ only, and only after installing | No                       | Hide the setting, explain that installing enables it    |
| Sending queued actions in the background | Yes            | No                                             | No                       | The app sends them itself when it reopens or reconnects |
| Background refresh                       | Yes            | No                                             | No                       | Refresh when the user opens the app                     |
| Unread badge on the app icon             | Yes            | Yes                                            | No                       | Skip it                                                 |
| Receiving a shared photo                 | Yes            | No                                             | No                       | Android only                                            |
| Sharing out to other apps                | Yes            | Yes                                            | Yes                      | Show a "copy link" button                               |
| Home screen icon shortcuts               | Yes            | Ignored                                        | Ignored                  | Nothing happens, which is fine                          |
| Guaranteed offline storage               | Can be granted | Decided by Safari                              | Decided by Safari        | Keep working without the guarantee                      |
| Browser database                         | Yes            | Yes                                            | Blocked in Lockdown Mode | Run without saved data                                  |

---

## The work, step by step

Each step below is one pull request. Every one ships with its own tests. Each is written so the
app still works fully if we stop after it.

Until the very last step, all of this stays switched off behind `NEXT_PUBLIC_PWA_ENABLED` and the
platform off switch. That is what makes it safe to merge each piece into `dev` as it is finished
instead of keeping one huge branch open for weeks.

### Making the app installable — done

Fill in the app manifest properly, generate the app icons and the iPhone launch images, and add
the tags iPhone needs to show the right icon and launch screen. No service worker yet. After this
step, Android offers to install the app and iPhone shows the correct home screen icon.

### Adding the service worker and an offline page

Install `@serwist/turbopack` and add the service worker. It saves a copy of the app itself — the
JavaScript, the styles, the layout — so the app can open with no connection. Add a proper offline
page for when someone tries to visit a page we have not saved, instead of the browser's dinosaur.

This step also sets up Playwright, because service workers cannot be tested in the normal test
runner. They only exist in a real browser.

### Caching images and data

Decide what gets saved and for how long. Product and look photos are saved for a long time,
because they never change once uploaded. Pages and public data are fetched fresh when possible and
fall back to the saved copy. Private and login-related requests are never saved.

Photo caching is matched by the file path and a configurable list of hosts rather than a
hard-coded address, because photos are already served from the API's own domain today and will
move to Cloudflare R2 later. Hard-coding today's address would silently break everything on the
day storage moves.

Photo storage limits are set lower on iPhone. Safari gives each site much less room and tends to
throw away an entire cache at once rather than trimming it, which would take the saved app with it.

Signing out clears everything that was saved.

### Handling app updates

When we deploy a new version, the old one can stay loaded on someone's phone. This step shows a
small "New version available — Reload" message when that happens.

It never interrupts someone mid-upload or mid-checkout.

### Remembering content for offline reading

Save the data the app has already loaded — the feed, profiles, product pages — into the browser's
database, so opening the app with no connection shows real content instead of empty spinners.

Only safe-to-save data is kept. The cart, checkout, and anything login-related are excluded. What
is saved is kept separate per user account and wiped on sign out.

Show a clear "You're offline — showing saved content" message so nobody mistakes old data for
current data.

### Storing push subscriptions

On the server, add a `push` module and a table to hold each device's notification subscription,
with endpoints for a device to register and unregister itself. Nothing is sent yet. This is
purely the plumbing, and it can go to production early because a table nobody writes to is
harmless.

### Sending push notifications

Read the events the app already publishes — likes, follows, new looks, order updates — and send a
push to each of the user's registered devices. Devices that have uninstalled the app are removed
automatically when the push service reports them as gone.

Two rules built in from the start:

- **Do not notify someone about something they are already looking at.** If the user has the app
  open, hold the push briefly and cancel it if they see the notification in the app.
- **Respect quiet hours.** Nobody wants a phone buzzing at 3am about a new follower.

This step also changes how notification settings work. Right now each notification type has a
single on/off switch, which cannot tell the difference between "I don't want this at all" and "I
want it in the app but not on my phone". We split that one switch into separate switches for
in-app, push, and email. Existing muted settings stay muted; email stays off unless someone turns
it on.

### Asking users to turn on notifications

Add the actual permission request, plus the settings toggle. The request only ever appears when
someone taps something asking for it — never as a popup on page load, which is how people end up
blocking notifications forever.

On iPhone this is only possible after the app is installed, so Safari users are shown how to
install first instead of a button that cannot work.

Also adds the unread count badge on the app icon.

### The install prompt

Add our own "Install Outfiqe" button at sensible moments, rather than letting the browser's
default prompt appear at a random time. If someone dismisses it, do not ask again for a while.

iPhone gives no install prompt at all, so it gets a short illustrated "tap Share, then Add to Home
Screen" panel instead.

### Saving actions made while offline

Let people like, follow, save, and mark notifications read with no connection. The action shows
immediately, is stored, and is sent for real once they are back online.

Only these safe actions are queued. They are all simple on/off toggles, so sending them twice
changes nothing and a few minutes' delay is invisible.

**Checkout and payment are deliberately never queued.** Prices change, stock sells out, and
payment approval expires. An order that looked successful offline and then failed hours later
would be a refund problem, not a small inconvenience. The pay button is disabled with a clear
message when offline.

**Publishing a look is also not queued**, but composing one is protected — the form and the chosen
photos are saved locally, so a creator writing a post in a tunnel does not lose their work. They
just need a connection to actually publish.

Two details that matter more than the list itself: repeated actions on the same thing collapse
into one before sending, so a flaky connection does not fire a burst that looks like an attack;
and the queue is capped, so a phone offline for a month does not flood the server on reconnect.

Comments are left for later. They could be queued, but they need their own handling for
duplicates and for a comment arriving into a conversation that has moved on.

### Sharing into and out of the app

Let people share a photo from any app on their phone directly into Outfiqe to start a new look
(Android only — iPhone does not support this). Add proper share buttons on looks, profiles, and
products, falling back to "copy link" where the phone's share sheet is unavailable. Add home
screen icon shortcuts for Shop, Explore, Search, and Wishlist.

### Background refresh

On Android, let the app quietly refresh the feed and notification count in the background so it is
already up to date when opened. iPhone cannot do this, so there it simply refreshes when the app
is opened. This is a small bonus, not something the app depends on.

### Storage limits, errors, and the off switch

Make sure every failure is harmless: no storage space, database blocked, service worker refuses to
install, permission denied. In every case the app falls back to working normally online. None of
them may ever show an error or a blank screen.

Add a "Clear offline data" button in settings, send service worker errors to Sentry, and wire up
the emergency off switch so we can disable all of this in production without deploying.

### Testing on real phones

Write down exactly what should happen on each device, and check it: iPhone, iPad, Android Chrome,
Android Firefox, and desktop. Add automated checks to CI that the app is still installable, still
works offline, and has not become slower.

At this point we also capture the real screenshots that make the Android install dialog look
proper, and the feature is turned on for users.

---

## What order this happens in

The website work runs mostly in order: installable, then the service worker, then caching, then
updates, then offline reading.

The two server steps — storing subscriptions and sending notifications — do not depend on any of
that and can be built alongside it.

Turning on notifications needs the service worker and both server steps finished. The install
prompt can be built at the same time. Offline actions need caching and offline reading. Sharing
needs the service worker. Background refresh comes near the end, then error handling, then the
device testing that finishes the work.

---

## Checks that run in CI

Automated quality gates are split in two, because performance scores move by a few points between
runs and a gate that fails at random gets switched off.

**These fail the build:** the app is installable, the service worker registers, the offline page
works, no console errors, and accessibility, best practices, and SEO all stay at or above their
current level. Also a size budget for JavaScript and total page weight, set from what the app
weighs today plus a little room.

**These only warn:** overall performance score and loading speed measurements.

Each page is measured three times and the middle result is used. Three real pages are checked —
the home page, the explore feed, and a product page — on a simulated mid-range Android phone on a
slow connection. Once the numbers have settled over a few weeks, performance can be promoted to a
hard gate too.

---

## Still to confirm

Nothing is blocking. The earlier open questions have been settled:

- Photos are served as plain public URLs, so the cache needs no special handling for signed links.
- Notification settings will be split per channel rather than duplicated into a second table.
- Each step is its own pull request into `dev`, with everything switched off until the end.
