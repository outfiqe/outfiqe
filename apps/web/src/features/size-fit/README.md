# size-fit

## Purpose

Everything a shopper uses to find the right size when every brand sizes differently: the brand's
size chart and fabric stretch on the product page, the "Find my size" modal, and the shopper's own
height and weight (remembered on the device, or saved to their account). Sizes are recommended
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

**Technical:** `ProductDetail` → `useFeatureFlag("size_fit")` + `product.hasSizeChart` →
`ProductFitSection` → `FindMySizeModal` → `recommendFitSize` from `@outfiqe/utils` (runs in the
browser, no request per keystroke) → `describeFitRecommendation`. Prefill: `useFitProfile` →
`GET /fit-profile/me`, else `readDeviceMeasurements`. Saving: `useSaveFitProfile` →
`PUT /fit-profile/me`.

## Non-obvious rationale

- **The same function recommends on the server and in the browser.** `recommendFitSize` lives in
  `@outfiqe/utils`, so the modal and the API's `GET /products/fits` can never disagree about a
  shopper's size.
- **Nothing is saved to the account without the shopper asking.** Guests' and signed-in shoppers'
  measurements stay on the device unless they press "Save to my account".
- **A muse's public `heightCm` isn't used to prefill.** The session doesn't carry it, and fetching
  the profile just to prefill one field wasn't worth an extra request on every product page.
