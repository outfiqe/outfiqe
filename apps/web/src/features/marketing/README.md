# marketing

## Purpose

The evergreen, mostly-static pages that sit around the storefront: company pages (About, How it
works, Contact), audience landing pages (Become a creator, Sell on Outfiqe), support (Help centre,
Size guide), and the legal/policy set (privacy, terms, cookies, returns, shipping, creator terms,
seller terms, community guidelines). These pages exist for trust, for search discoverability, and
to answer the questions a shopper, creator or brand has before they commit.

## Structure

- `components/MarketingShell.tsx` — the page frame: `SiteHeader`, a centred `<main>` (`prose` or
  `wide` width), a `Breadcrumbs` trail, `SiteFooter`, `MobileTabBar`. Every marketing route renders
  its body inside this.
- `components/MarketingHero.tsx` — the eyebrow + `<h1>` + lede block, matching the `/apply` page's
  existing hero treatment.
- `components/MarketingSection.tsx` — an `<h2>` section wrapper.
- `components/FeatureGrid.tsx` — the `border-t-2 border-foreground` feature-card grid (2 or 3 up),
  the same pattern `/apply` already uses.
- `components/StepList.tsx` — a numbered `<ol>` for genuine sequences (the shopper/creator/brand
  "how it works" steps).
- `components/MarketingCta.tsx` — the bordered call-to-action block with a primary and optional
  secondary `Button asChild` link.
- `components/FaqAccordion.tsx` — a native `<details>/<summary>` list (accessible, no JS) that
  optionally emits `FAQPage` JSON-LD via `@/shared/seo`.
- `components/LegalDocument.tsx` — the long-form legal wrapper: title, summary, last-reviewed date,
  a "working draft" banner while `status="draft"`, and prose typography via arbitrary-variant
  Tailwind selectors so legal pages don't each restyle `h2`/`ul`/`a`.
- `index.ts` — barrel.

The route files live under `app/` directly (`app/about/page.tsx`, `app/legal/privacy/page.tsx`,
etc.), not in a route group — `MarketingShell` already provides the shell, so a group layout would
add nothing.

## Funnel

**User-facing:** a visitor reaches these from the footer (every marketing and legal page is linked
there), from in-body links on other marketing pages, from the 404 page, or from search. The pages
cross-link heavily — How it works links to the creator and brand pages, the legal pages link to
each other and to the help centre — so a crawler and a reader can move between them.

**Technical:** each route file exports `metadata` (or `generateMetadata`) built with
`buildPageMetadata` from `@/shared/seo`, and renders `MarketingShell` + the shared components.
FAQ-bearing pages pass `withSchema` to `FaqAccordion`. The routes are registered in
`@/shared/seo/routes.ts` so they appear in `sitemap.ts`.

## Non-obvious rationale

- **Legal pages ship as drafts, not fabricated final copy.** Every legal page renders with
  `status="draft"` — a visible banner — and every fact that needs a confirmed company detail
  (registered entity, address, governing-law venue, retention periods, return window, fee tables)
  is marked inline as `[NEEDS INPUT: …]`. The structure, the operationally-verifiable facts (COD /
  eSewa / Khalti, zone-based delivery fees, cancel-before-shipment, the 7-day attribution window,
  verified-purchase reviews, hashed passwords, encrypted bank accounts), and the cross-linking are
  real; the parts a lawyer and the founders must sign off are flagged, not invented. Do not remove
  the draft banner or the `[NEEDS INPUT]` markers until the corresponding content is confirmed.
- **FAQ uses `<details>`, not a design-system component.** There is no accordion primitive in
  `@outfiqe/design-system`, and a native `<details>` is the correct semantic element for a
  disclosure — accessible by default, works without JS, and pairs cleanly with `FAQPage` schema.
- **Contact has no form.** There is no contact-submission endpoint in the API. The page routes
  people to the right existing channel (help centre, apply, creator programme) and shows a direct
  email / social links only when `NEXT_PUBLIC_CONTACT_EMAIL` / `NEXT_PUBLIC_SOCIAL_URLS` are set.
- **`/for-brands` is a marketing page; `/apply` is the form.** `/apply` already existed as the
  application form with a short intro. `/for-brands` is the fuller pitch and links to `/apply` for
  the form itself, rather than duplicating or replacing it.
