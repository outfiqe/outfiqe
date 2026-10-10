# size-fit

## Purpose

Everything a shopper uses to find the right size when every brand sizes differently: the brand's
size chart and fabric stretch on the product page, the "Find my size" modal, the "Find what fits
me" page (`/fit`), "My measurements" in settings, and the shopper's own height and weight
(remembered on the device, or saved to their account), which the outfit board also uses. Sizes are recommended
from each product's own height and weight ranges, never from the label, because an "L" at one
brand can be an "XL" at another.

## Structure

- `components/ProductFitSection.tsx` — the product page block under the size picker: heading,
  `StretchBadge`, `SizeChartTable` (both from `@outfiqe/components`, with the selected size
  highlighted) and the "Find my size" button.
- `components/FindMySizeModal.tsx` — height and weight inputs, a live recommendation, "Select M"
  buttons (disabled when that size is sold out), "Save to my account" for signed-in shoppers and a
  link to the "Find what fits me" page. Its content only mounts while open, so it reads the
  browser's storage after hydration and never during server rendering.
- `components/FitFinder.tsx` — the `/fit` page body: height and weight inputs (prefilled from
  the link, the account or the device), chips for the kinds of clothing that take size charts, and
  every fitting product with "Your size: M" under it. Measurements and the chosen kind live in the
  URL, so back, refresh and sharing work. Prompt, loading, error, empty and load-more states.
- `components/MyMeasurementsSettings.tsx` — settings → My measurements (`/settings/measurements`,
  which `/settings/sizes` redirects to): save, change or remove height and weight, translated
  through the `fitProfile` messages.
- `hooks/useShopperMeasurements.ts` — the account's measurements, else the device's. The device
  value is read through `useSyncExternalStore` with an empty server snapshot, so server rendering and
  hydration agree.
- `api/fittingProductsApi.ts` + `hooks/useInfiniteFittingProducts.ts` — `GET /products/fits`.
- `utils/describeFitRecommendation.ts` — turns a `recommendFitSize` result into the headline and
  one-line reason the modal shows, including the stretch reasoning and how far outside the nearest
  size the shopper is.
- `utils/measurementDraft.ts` — text inputs ↔ `FitMeasurements`, valid only as whole numbers inside
  the shared bounds.
- `utils/deviceMeasurements.ts` — remember, read and forget measurements in `localStorage`, every
  call wrapped so blocked storage (private windows, strict settings) just behaves as empty.
- `utils/fitPagePath.ts` — `/fit?heightCm=…&weightKg=…`.
- `api/fitProfileApi.ts` + `hooks/useFitProfile.ts` — `GET`/`PUT`/`DELETE /fit-profile/me`; the
  query only runs for a signed-in person.
- `index.ts` — what other features import.

## Funnel

**User-facing:** on a product with a complete size chart (and while the `size_fit` feature flag is
on), the shopper sees the chart and the stretch label under the size picker. "Find my size" opens
the modal, already filled in if they've used it before. They type their height and weight and
immediately see their size, or the two sizes they're between, or the nearest size and how far off
they are. "Select M" picks that size on the page. Signed-in shoppers can save the measurements to
their account.

On `/fit` they enter their height and weight (or find them already filled in), see every piece
in stock that is cut for them with the size to pick, and can narrow to one kind of clothing. In
settings they can save or remove their measurements.

**Technical:** `ProductDetail` → `useFeatureFlag("size_fit")` + `product.hasSizeChart` →
`ProductFitSection` → `FindMySizeModal` → `recommendFitSize` from `@outfiqe/utils` (runs in the
browser, no request per keystroke) → `describeFitRecommendation`. Prefill: `useFitProfile` →
`GET /fit-profile/me`, else `readDeviceMeasurements`. Saving: `useSaveFitProfile` →
`PUT /fit-profile/me`. `app/fit/page.tsx` (server; `noindex` when the URL carries measurements,
canonical `/fit`) → `FitFinder` → `useInfiniteFittingProducts` → `GET /products/fits`. The outfit
board: `outfit-build`'s `useMySizeByProductId` → `useShopperMeasurements` → `recommendFitSize`
per item.

## Non-obvious rationale

- **The same function recommends on the server and in the browser.** `recommendFitSize` lives in
  `@outfiqe/utils`, so the modal and the API's `GET /products/fits` can never disagree about a
  shopper's size.
- **Nothing is saved to the account without the shopper asking.** Guests' and signed-in shoppers'
  measurements stay on the device unless they press "Save to my account".
- **A muse's public `heightCm` isn't used to prefill.** The session doesn't carry it, and fetching
  the profile just to prefill one field wasn't worth an extra request on every product page.
