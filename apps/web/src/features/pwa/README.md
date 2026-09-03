# PWA

## Purpose

Owns everything that makes the web app installable as a Progressive Web App and everything the
installed app needs at launch: the web manifest's icon/shortcut content, the browser theme colour,
Apple's home-screen metadata, and the iOS startup (splash) images. It is the single home for
install-related document metadata — `app/layout.tsx` composes it into the root `metadata` and
`viewport` exports rather than each concern being scattered across the SEO module.

Later chunks of `docs/PLAN-PWA.md` add the service worker, offline caching, push, and the
install prompt to this feature. Today it covers installability only.

## Structure

- `constants/appIcons.ts` — the install icon matrix (192/512 × `any`/`maskable`), the Apple touch
  icon size/path, the maskable safe-zone ratio, and the file-name/path derivation shared by the
  manifest and the asset generator. Nothing else may hardcode an icon filename.
- `constants/appleSplashScreens.ts` — the iOS devices we ship startup images for, plus the same
  file-name/path derivation for splash assets.
- `constants/appShortcuts.ts` — the manifest `shortcuts` entries and the routes they open.
- `constants/appTheme.ts` — the light/dark theme colours, mirroring `--background` in
  `packages/design-system/tokens.css`, and the colour-scheme media queries.
- `constants/appMetadata.ts` — the `icons`, `appleWebApp`, and manifest-path fragments of the root
  document metadata.
- `utils/manifestIcons.ts` — maps the icon matrix into the manifest's `icons` array.
- `utils/appleSplashMedia.ts` — builds the media query that selects one splash image for one device.
- `utils/appViewport.ts` — the root `viewport` export, including the theme colour per colour scheme.
- `components/AppleSplashLinks.tsx` — renders one `<link rel="apple-touch-startup-image">` per
  supported device into the document head.

Generated assets live in `public/icons/` and `public/splash/` and are produced by
`apps/web/scripts/generate-pwa-assets.mts` (`pnpm --filter @outfiqe/web generate:pwa-assets`),
which reads the same descriptor constants listed above. Re-run it whenever `public/logo.svg`, the
icon matrix, or the splash device list changes, and commit the output.

## Funnel

**User-facing.** On Android/desktop Chrome the browser reads the manifest, sees a name, a 192 and a
512 icon, a maskable icon, a scope and `display: standalone`, and offers to install. On iOS the
user picks Share → Add to Home Screen; iOS reads the Apple touch icon for the home-screen tile and,
on launch, the `apple-touch-startup-image` matching that exact device to paint a branded splash
instead of a white flash. Once installed, long-pressing the icon on Android surfaces the manifest
shortcuts (Shop, Explore, Search, Wishlist), and the OS status/title bar picks up the theme colour
for the active colour scheme.

**Technical.** `app/manifest.ts` calls `toManifestIcons()` and spreads `appShortcuts`, and Next
serves the result at `/manifest.webmanifest`. `app/layout.tsx` spreads `rootMetadataDefaults`, then
overrides `manifest`, `icons`, and `appleWebApp` from this feature and re-exports `pwaViewport` as
the route's `viewport`. `AppleSplashLinks` renders inside the layout's `<head>`, mapping each
`AppleSplashScreen` descriptor through `toAppleSplashMediaQuery` and `appleSplashPath`. The
generator script imports those same descriptors so a device added to the list and the image
written to disk can never drift apart.

## Non-obvious rationale

**`start_url` differs from `id` on purpose.** `start_url` is `/?source=pwa` so installed launches
are attributable in analytics, while `id` is pinned to `/` so changing that query string later
does not make browsers treat it as a brand-new app and orphan existing installs.

**Splash images are portrait-only.** Covering both orientations doubles a 13-image set to 26
committed PNGs for a portrait-first shopping app. A landscape launch falls back to the plain
background colour, which is an acceptable trade for halving the asset weight. Revisit if iPad
usage turns out to matter.

**Maskable icons are composed, not just resized.** Android masks the icon to a platform shape and
clips anything outside the inner 80%. The generator therefore renders the logo at
`MASKABLE_SAFE_ZONE_RATIO` and composites it onto a full-bleed themed square, rather than shipping
the same bitmap for both purposes — otherwise the mark gets its edges cut off on most launchers.

**Icons and the manifest link moved out of `shared/seo`.** They are install metadata, not search
metadata, and keeping them beside the icon descriptors is what lets the manifest, the Apple touch
icon, and the generator share one source of truth. `rootMetadataDefaults` still owns everything
genuinely SEO-shaped.

## Follow-ups

- **Manifest `screenshots`** are not shipped yet. They enrich the Android/desktop install dialog
  but require real captures of the running app; capture them once Playwright is set up (see the
  service-worker chunk in `docs/PLAN-PWA.md`) rather than shipping placeholder imagery.
