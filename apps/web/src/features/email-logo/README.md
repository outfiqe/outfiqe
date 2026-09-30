# email-logo

## Purpose

Draws the Outfiqe logo as a PNG for emails, from the same logo definition the site header uses, so changing the logo changes it in every email too.

## Structure

- `EmailLogoLockup.tsx` — the logo mark and wordmark laid out for the image renderer: the mark's paths (`LOGO_MARK_PATHS`), the wordmark segments (`LOGO_WORDMARK_SEGMENTS`) and their colours (`lightThemeBrandHex`), all from `@outfiqe/design-system`. Its proportions are the site header's `Logo` (`md` size) scaled up.
- `EmailLogoLockup.test.tsx` — checks the lockup draws exactly the shared paths, wordmark and colours.
- `../../app/email/logo.png/route.tsx` — the route that serves it: `GET /email/logo.png`, an `ImageResponse` at `EMAIL_LOGO_RENDER_SIZE` (`@outfiqe/utils`), with the wordmark font `assets/fonts/cabinet-grotesk-700.ttf`.

## Funnel

**User-facing:** someone opens an Outfiqe email. The header loads `https://<site>/email/logo.png` and shows the same logo they see on the site.

**Technical:** `apps/api`'s email layout (`shared/email-templates/layout.ts`) puts `<img src={emailLogoUrl(FRONTEND_URL)}>` in every email. The route is `force-static`, so `next build` renders the PNG once per deploy and the CDN serves it.

## Non-obvious rationale

- **Why a PNG route, not the SVG.** Gmail and Outlook don't display SVG in email. Drawing the PNG from the shared definition, rather than exporting a copy, means a logo change reaches emails with no manual re-export. That includes emails already sent, because an email loads its images when it's opened.
- **When a change shows up.** On the next deploy. Some email apps (Gmail's image proxy, for one) keep their own copy of an image for a while, so an old copy can linger in those apps for a short time.
- **Why a TTF copy of Cabinet Grotesk.** The image renderer only reads TTF/OTF/WOFF, and the design system ships the font as WOFF2. `assets/fonts/cabinet-grotesk-700.ttf` is that same weight (700, the header's `font-bold`) converted once. If the display font ever changes, replace this file too.
- **Why colours come from `brand-palette.ts`, not `tokens.css`.** The route can't read a CSS file from the design-system package once it's deployed. `LIGHT_THEME_BRAND_TOKENS` mirrors the tokens it needs, and a design-system test fails if they ever differ from `tokens.css`.
- **Why there's no test of the PNG itself.** The renderer's final PNG step (sharp) rejects data created inside Vitest's module sandbox, so the route can't be rendered in a unit test. The lockup test covers everything that decides what the image looks like.
