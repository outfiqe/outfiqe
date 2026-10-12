# Size charts and fit finder — rollout runbook

The full spec lives in the PRD artifact ("PRD: Brand-Defined Size Standards & Fit Transparency").
This doc is the operational side: how to ship it, how to turn it on, and what to watch.

## What the feature does, in one line

Brands define their own size scales and give every size a height and weight range plus a fabric
stretch setting; shoppers see that chart on the product page, get a recommended size from their
height and weight, and can browse everything that fits them on `/fit`.

## What goes live with the merge, and what waits for the flag

Outfiqe no longer has an admin size list or "My sizes", so the parts that replace them can't sit
behind a flag; they go live as soon as the code ships. The shopper-facing fit surfaces wait for
the `size_fit` feature flag (admin → Platform settings → Feature switches, a DB-backed switch, **off** by default).

| Area                                                         | Live with the merge | Behind `size_fit` |
| ------------------------------------------------------------ | ------------------- | ----------------- |
| Brand size standards, size-chart form, "Size chart" action   | yes                 |                   |
| Admin: size-chart switch per garment type, chart in review   | yes                 |                   |
| Settings → My measurements (old `/settings/sizes` redirects) | yes                 |                   |
| Outfit board "your size" hints from measurements             | yes                 |                   |
| Product page size chart, stretch label, "Find my size" modal |                     | yes               |
| `/fit` page and `GET /api/products/fits`                     |                     | yes               |

## Shipping the code (flag stays OFF)

1. `pnpm test` from root, green. Merge the latest `dev` into `feat/brand-size-fit`, re-test.
2. `feat/brand-size-fit` → `dev` (PR) → `main` (normal release).
3. Deploy: `pnpm install` (regenerates the Prisma client) → `prisma migrate deploy`. Two
   migrations apply, in order:
   - `20261010120000_add_brand_size_standards_and_fit_ranges` adds the new tables and columns, the
     CHECK constraints (added `NOT VALID`, then validated, so no long lock), and **backfills** one
     size standard per brand and garment type from the labels its products already use, linking
     every product to it. Footwear, headwear and accessories are marked as not taking size charts.
   - `20261010180000_drop_size_options_and_saved_sizes` drops `size_options` and `saved_sizes`.
     Shoppers' saved size labels are not carried over (a label can't become a height and weight);
     settings tells them to add their measurements instead.
4. Restart the API and web. Check:
   - every brand with products has size standards (brand dashboard → Products → Size standards);
   - existing products still edit and sell normally (their sizes are unchanged copies);
   - admin → Garment types shows "Size charts on/off" per type.

## Before turning `size_fit` on

1. Tell brands that sizes are now theirs to define, and ask them to add size charts (email and a
   dashboard banner). The "Add size chart" badge on each product card tracks what's missing.
2. Wait until at least **100 approved products** have a complete chart, so `/fit` doesn't look
   empty. Count them with:

   ```sql
   SELECT COUNT(*) FROM products p
   JOIN product_types t ON t.id = p.product_type_id
   WHERE p.status = 'APPROVED' AND p.deleted_at IS NULL AND t.supports_fit_ranges
     AND EXISTS (SELECT 1 FROM product_sizes s WHERE s.product_id = p.id)
     AND NOT EXISTS (
       SELECT 1 FROM product_sizes s WHERE s.product_id = p.id AND s.min_height_cm IS NULL
     );
   ```

3. Optionally switch the flag to an allow list first (a few staff and brands) to check real charts
   on real product pages.

## Turning it on

1. Admin → Feature switches → `size_fit` (shown as "Size charts and fit finder") → everyone.
2. In the same release window, add the launch copy that was held back while the page was hidden:
   - `/size-guide`: a section about brand size charts, fabric stretch and a link to `/fit`;
   - `apps/web/src/app/sitemap.ts`: add `/fit` (canonical, no query string).
3. Turning the flag off again hides the product-page chart and `/fit` immediately; brand charts and
   saved measurements stay as they are.

## What to watch

- `GET /api/products/fits` latency and 429s (rate limit: 60 requests a minute per IP).
- Size-related returns and support tickets per 100 orders, before vs. after.
- How many PDP visits open "Find my size", and how often the recommended size is added to the bag.
- Logs must show `heightCm=[redacted]` / `weightKg=[redacted]` on `/api/products/fits` lines; if a
  raw value ever appears, the redaction in `http-logger` / `instrument.ts` has regressed.

## Later steps from the PRD

- Make a complete chart required for new products in garment types that take charts (FR-7), once
  brands have had about two weeks with the charts live.
- Open questions still to decide: near fits ("close fits") on `/fit`, ft/in and lb inputs, a third
  "slight stretch" value, and whether to keep the starter templates.
