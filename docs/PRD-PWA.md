# Outfiqe as an Installable, Offline-Ready App — PRD

Internal reference doc, committed to the repo. It describes the whole effort to turn the Outfiqe
web app into something a person can install on their phone and keep using when the connection is
poor. The build details and the reasoning behind each technical choice live in
`apps/web/src/features/pwa/README.md`; the by-hand test pass is `docs/TESTING-PWA.md`. This
document is the product-level picture: what it is for, what a person actually gets, what it
deliberately does not try to do, and what has to happen before it is switched on for everyone.

## Why we did this

Outfiqe's shoppers and creators are on phones, often on connections that come and go. Two things
were true before this work:

- The site was a browser tab. There was no way to keep it on a home screen, no app icon, no
  launch screen — nothing that makes it feel like an app people return to.
- The moment the connection dropped, the site was a dead end. A page you had just been looking at
  would fail to reload; a page you had never opened showed the browser's own error screen.

We wanted Outfiqe to behave like an app you install once and open like any other, and to stay
useful — not perfectly, but usefully — when the network is against you. We wanted this without
shipping anything to an app store, and without standing up new backend infrastructure the codebase
did not already have.

## What a person gets

**They can install it.** On Android and desktop Chrome, after the person has visited a few times,
Outfiqe offers its own "Install Outfiqe" bar. On iPhone and iPad, where the browser has no install
button to offer, the same bar shows the "tap Share, then Add to Home Screen" steps instead.
Either way the result is a real app icon, a branded launch screen sized to the device, and the app
opening with no browser chrome around it. Long-pressing the icon gives shortcuts straight to Shop,
Explore, Search, and Wishlist.

**Pages they have seen keep working with no connection.** As someone moves around the app, each
page they land on is quietly saved. Going back to a page they have already seen works with no
network at all. Opening a page they have never seen shows a branded "You're offline" page — the
app's own, not the browser's error.

**The app is not empty on a cold start offline.** Beyond whole pages, the content a person has
scrolled through — the feed, products they opened, looks, a brand's catalogue, the creator
leaderboard — is kept in the browser's own storage and read back when the app starts. Opening
Outfiqe with no connection shows real content, not a screen full of loading placeholders. Only
this specific set of content is ever saved; anything tied to a single account, like a cart or an
order, is never written to the device.

**Small actions taken offline are not lost.** Liking a look, saving one, or following a creator
while offline is remembered and sent the moment the connection returns. These are safe to delay
because doing one twice changes nothing and a few minutes' lag is invisible. Checkout and starting
a payment are deliberately never treated this way — those always need a live connection and fail
fast if there isn't one, because a price or a stock level could be wrong by the time a delayed
request finally went through.

**They can turn on notifications.** A signed-in person who has been using the app is offered a bar
to turn on notifications; tapping it shows a short explainer before the browser's own permission
prompt. On iPhone this only works once the app is on the home screen, so an iPhone user still in a
Safari tab is told to install first rather than shown a button that could not work. Once on,
notifications for likes, follows, new looks, and orders arrive on the lock screen and open the app
at the right place. While the app is open its icon carries the unread count; while it is closed
the icon is still marked when something arrives, so there is a sign before the app is next opened.
Each notification type can also be left in the in-app bell but turned off on the phone, or the
other way around.

**They can share into and out of it.** On Android, once installed, Outfiqe shows up in the phone's
own share sheet — sharing a photo from another app opens a "New post" screen with that photo
already staged. In the other direction, every look, creator profile, and product has a Share
button that opens the phone's share sheet, or copies the link where there is no share sheet.

**On Android, the feed stays fresh on its own.** When the browser decides — by its own judgement
of how much someone uses the app — that Outfiqe is worth it, the feed quietly refreshes in the
background so opening the app after a while shows something already caught up. iPhone has no
equivalent, so there the feed simply refreshes when the app is opened, as it always has. This is a
small bonus; nothing depends on it.

**They are told when there is a new version.** Once someone has the app, they keep running the
version they downloaded until it is replaced. When we deploy, a small "a new version is ready" bar
appears with Reload or Later. Nothing reloads on its own, and the bar never appears on the cart,
checkout, or payment pages, where a mis-tap costs money or work.

**They can clear it out.** A "Clear offline data" button in settings forgets the saved pages,
photos, and content in one go. Signing out does the same automatically.

## What this deliberately does not do

- **No app store presence.** This is the web app, installed from the browser. There is no build
  submitted to Google Play or the App Store.
- **No offline checkout or payment.** Anything that moves money or commits an order always
  requires a live connection. This is a firm line, not a limitation to be lifted later.
- **Nothing account-specific is saved to the device.** Carts, orders, wallet, messages, settings,
  and anything under the API are never written to disk, so signing out on a shared phone leaves
  nothing behind. Offline access to personalised data is a separate problem for another time.
- **The admin app is untouched.** All of this lives in the shopper/creator web app only. The
  admin app has no offline story and is not getting one here.
- **iPhone's limits are accepted, not worked around.** iPhone cannot refresh in the background,
  cannot receive a shared file into the app, and gives each site far less storage. In each case
  the app falls back to working normally rather than pretending the capability exists.
- **No new backend infrastructure.** The only new server-side piece is a store of push
  subscriptions. Everything else reuses what was already there.

## How it is controlled

- **A build-time switch turns the whole thing on.** Until it is set when the app is built, no
  service worker is registered and the app behaves exactly as it did before. This is how the
  feature stays off for everyone until we are ready.
- **A separate runtime switch turns it off in an emergency.** If something goes wrong in
  production, a single server setting — changed and applied without shipping new code — disables
  the whole offline layer. Anyone who already has it installed gets the service worker removed and
  its caches cleared the next time they open the app; merely stopping new installs would leave
  everyone who already installed it running the thing being turned off.
- **The device is never trusted with more than it should hold.** Storage limits are lower on
  iPhone on purpose. When the browser reports it is out of room, the caches clear themselves and
  carry on rather than jamming. Every failure path — no storage, a blocked database, a worker that
  will not install, a permission denied — leaves the app working normally online, never showing an
  error or a blank screen.

## How we know it works

- **Automated, on every change:** the manifest still carries everything a browser checks before
  offering an install, both required icon sizes actually resolve, a service worker registers and
  takes control, saved pages come back with the network genuinely cut, saved content is restored
  and rendered, content outside the allowlist never is, the offline page is served for an unseen
  route, a shared photo is stashed and handed to the compose screen, and a push payload reaches
  the point where only the browser's own permission stops it. A Lighthouse pass runs against the
  app shell so a regression in its weight shows up as a warning.
- **By hand, before it goes live:** `docs/TESTING-PWA.md` is the checklist someone walks on a real
  iPhone and a real Android device — an actual install, a real home screen icon, a notification
  actually arriving, a share sheet actually opening. Some of this can only be confirmed on
  hardware.
- **In production:** anything the service worker throws is sent to our error tracking, tagged so
  it is easy to tell apart from an ordinary page error.

## Before it is switched on for everyone

- Capture real screenshots against an environment with real catalogue data, so Android's install
  dialog shows a genuine preview rather than empty states, and commit them.
- Walk the device checklist on at least one real iPhone and one real Android device.
- Confirm the Lighthouse numbers have not regressed from the previous release.
- Resolve the outstanding Vercel deployment blocker so preview and production deploys work.
- Set the build-time switch on in production and deploy. Everything above is inert until this is
  done.

## Known follow-ups

- One JavaScript file is larger than the size that can be saved for offline use, so the first
  visit to a page that needs it will not work offline until it has been downloaded once. It is
  worth splitting up regardless of offline support.
