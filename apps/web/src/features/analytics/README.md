# analytics

## Purpose

Product analytics with PostHog: it sends the shopper journey (pages, product views, cart,
checkout, payment failures) to PostHog, asks for cookie consent, links events to a signed-in
account, and keeps personal details out of everything it sends. The plan behind it, with what we
measure and why, is in `docs/PLAN-ANALYTICS-POSTHOG.md`. Event names and their properties come
from the shared catalog in `@outfiqe/utils` (`ANALYTICS_EVENTS`).

## Structure

- `utils/analyticsClient.ts`: the only code that talks to `posthog-js`.
  - `initAnalytics` starts PostHog from `src/instrumentation-client.ts`.
  - `trackEvent` sends a catalog event. Its type only accepts catalog names, each with that
    event's exact properties.
  - `identifyViewer`, `resetViewer`: link events to an account, and forget it on sign-out.
  - `acceptAnalytics`, `rejectAnalytics`, `openCookieSettings`: the consent choices.
  - Every function does nothing until PostHog has started.
- `utils/analyticsConsentStore.ts`: a tiny store holding the visitor's consent status and whether
  the banner was reopened. Components read it through `useSyncExternalStore`.
- `utils/scrubPersonalData.ts`:
  - `redactPersonalText` replaces anything that looks like an email address or a Nepali mobile
    number;
  - `scrubPersonalData` runs it over every event before it leaves the browser (`before_send`).
- `hooks/useAnalyticsConsent.ts`: the consent status for components.
- `hooks/useTrackView.ts`: sends a "viewed" event once per item (product, checkout, payment
  failure), however often the component re-renders.
- `components/CookieConsentBanner.tsx`: the cookie banner, offering "Accept all" or "Essential
  only". Mounted in `app/providers.tsx` inside `DeferredMount`.
- `components/CookieSettingsButton.tsx`: the footer's "Cookie settings" link that reopens it.
- `components/AnalyticsIdentity.tsx`: mounted inside `AuthProvider`.
  - It identifies a signed-in visitor who accepted analytics by their user id, with `user_role`,
    `is_creator`, `is_brand_owner` and `is_internal` (staff and riders).
  - Whenever nobody is signed in it calls `resetViewer`. That only resets when PostHog still holds
    an identified user, so it catches a sign-out here, in another tab, or an expired session,
    without splitting an anonymous visitor's session.
- `constants/analytics.constants.ts`: the relay path, PostHog hosts and defaults, consent
  statuses, and `PRIVATE_ANALYTICS_CLASS_NAME`.
- `constants/cookieConsent.constants.ts`: the banner text.
- `index.ts`: the components other parts of the app mount. Feature code imports `trackEvent`
  and `useTrackView` from their own files instead, so a cart or checkout hook doesn't pull in the
  auth feature through `AnalyticsIdentity`.

## Funnel

**User-facing:**

1. A visitor opens Outfiqe, and a small banner asks about cookies.
2. Until they choose, and if they pick "Essential only", PostHog only counts the visit
   anonymously, with no cookies and no profile.
3. "Accept all" turns on normal analytics and session recordings, with personal details hidden.
   Signing in then links their activity to their account.
4. The footer's "Cookie settings" brings the banner back to change the choice.

**Technical:**

1. `instrumentation-client.ts` → `initAnalytics`. This runs only when
   `NEXT_PUBLIC_APP_ENV === "prod"` and `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` is set, so local and
   preview builds send nothing.
2. Feature code → `trackEvent` / `useTrackView` → `posthog.capture` → `before_send` scrubbing →
   `POST /a7x/...` on our own domain.
3. `next.config.ts` rewrites `/a7x/static/*` and `/a7x/array/*` to `us-assets.i.posthog.com`,
   and the rest of `/a7x/*` to `us.i.posthog.com`.

Events sent from the browser today:

| Event                                                                                | Sent from                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `product:detail_view`                                                                | `features/product-detail/components/ProductDetail.tsx`                    |
| `cart:item_add`                                                                      | `features/cart/hooks/useAddToCart.ts`                                     |
| `cart:item_remove`                                                                   | `features/cart/hooks/useRemoveCartItem.ts`                                |
| `checkout:checkout_start`, `checkout:payment_method_select`, `checkout:order_submit` | `features/checkout/hooks/useCheckoutAnalytics.ts`, used by `CheckoutForm` |
| `checkout:payment_fail`                                                              | `features/payments/components/PaymentFailed.tsx`                          |
| `look:detail_view`                                                                   | `features/explore/posts/components/PostDetailModal.tsx`                   |
| `look:product_tag_click`                                                             | `features/explore/posts/components/PostTagPill.tsx`                       |
| `search:query_submit`                                                                | `features/search/hooks/useTrackSearchResults.ts`, from both results pages |
| `wishlist:item_add`                                                                  | `features/wishlist/hooks/useToggleWishlist.ts` (saves only)               |
| `taste:category_select`                                                              | `features/categories/hooks/useTastePreferences.ts` (saves, not resets)    |
| `outfit_build:build_create`                                                          | `features/outfit-build/my-builds/components/MyBuildsPage.tsx`             |
| `outfit_build:build_publish`                                                         | `features/outfit-build/publishing/hooks/useBuildLook.ts`                  |
| `app:pwa_install`                                                                    | `features/pwa/install/utils/installPromptStore.ts` (`appinstalled`)       |
| `app:push_enable`                                                                    | `features/pwa/push/utils/pushClient.ts` (new subscriptions only)          |
| `$pageview` / `$pageleave`                                                           | automatically, on every route change                                      |

`useTrackView` takes `null` as its key while a view isn't ready (search waits for its result
count), and fires once the key is set.

## Non-obvious rationale

- **Why the relay is excluded from `proxy.ts`.** The proxy's matcher skips `a7x` (and `healthz`),
  and `proxy.test.ts` checks it. Without that, every analytics request would run the proxy
  function and use Vercel Active CPU, the problem the cached homepage fixed. The rewrite itself
  runs at Vercel's edge without starting a function. The service worker never caches the relay
  either (`analyticsRelayNeverStored` in `app/sw.ts`).
- **Why `/a7x` and not `/ingest` or `/analytics`.** Ad blockers block the obvious names, and a
  first-party path is why we proxy at all.
- **Why `skipTrailingSlashRedirect` is on.** PostHog's API paths end in a slash (`/e/`). Without
  it, Next would answer every event with a redirect first. Pages keep their canonical URLs through
  `buildPageMetadata`, so `/shop/` and `/shop` don't compete in search.
- **Consent, using PostHog's own model.**
  - `cookieless_mode: "on_reject"` means a visitor who hasn't chosen, or chose "Essential
    only", is counted with a privacy-preserving server-side hash: no cookies, no profile.
    Cookieless tracking is switched on in the PostHog project settings, as the SDK requires.
  - `opt_out_capturing_by_default: true` is what makes "hasn't chosen yet" count cookieless.
    Without it, `on_reject` sends nothing at all until the visitor clicks a button.
  - PostHog stores the choice itself, and `get_explicit_consent_status()` is read rather than
    keeping a second copy.
  - Identifying and session recording only happen after "Accept all".
  - `posthog.reset()` also wipes the stored choice. So "Essential only" never calls it
    (`opt_out_capturing` already drops the identity when it switches to cookieless), and
    `resetViewer` resets first and then opts back in when the visitor had accepted. That's the
    order PostHog documents.
- **Session recordings hide personal details in two layers.**
  - Every input is masked (`maskAllInputs`), and every recorded text passes through
    `redactPersonalText` (`maskTextSelector: "*"` with `maskTextFn`).
  - Areas full of private details carry `PRIVATE_ANALYTICS_CLASS_NAME` (`ph-no-capture`), which
    PostHog leaves out of recordings and click tracking entirely:
    - checkout address fields;
    - saved addresses, and the address form;
    - bank accounts, and the add-bank form;
    - the withdraw section;
    - the delivery address on an order;
    - the whole rider app.
  - Which sessions get recorded (checkout, payments and failures always, 20% of the rest, at
    least 5 seconds) is set in PostHog's session replay settings, not in code.
- **Banner text is English constants**, like the footer and most of the site. Only outfit
  builds, fit and order tracking are translated today. The wording is a placeholder until the
  lawyer's version, which goes with the privacy and cookie policy update.
- **PostHog error tracking is off** (`capture_exceptions: false`) because Sentry already does
  that job.
