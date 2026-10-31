# @outfiqe/web

## Purpose

The public Outfiqe site and the signed-in shopper, creator and brand dashboards, built with Next.js (App Router). It also ships as an installable, offline-capable PWA (`src/features/pwa`).

## Structure

- `src/app/` — routes. A route file loads data and composes feature components; it holds no feature logic of its own. `src/app/(home)/README.md` explains how the homepage is put together.
- `src/features/<feature>/` — one folder per product area (see "Feature layout" below). Each has its own `README.md`.
- `src/components/` — app-wide chrome shared by many routes: the site header and footer, the dashboard sidebar and mobile nav, and modals such as followers/following.
  - The footer (`SiteFooter`) has two layouts built from one list of link groups (`siteFooter.constants.ts`). On phones, `FooterAppMenu` shows each group as an app-style row with an icon that opens to its links, using native `<details>`, so it needs no JavaScript and every link stays in the page for search engines. A short Terms · Privacy · Help row stays visible below it. From tablet width up, `FooterLinkColumns` shows the same groups as columns.
- `src/shared/` — code used by several features with no single owner: `api/` (uploads), `components/` (`AppImage`, the photo crop and category/type filter pieces), `hooks/`, `lib/` (the API client and a few small cross-feature API clients, error messages, formatting, the content security policy) and `seo/` (metadata, JSON-LD, sitemap sources).
- `src/i18n/` — English and Nepali messages and the chosen-language handling (see its `README.md`).
- `src/testing/` — shared test setup and helpers.
- `src/proxy.ts`, `src/instrumentation*.ts` — request proxy and monitoring set-up.
- `e2e/` — Playwright tests (`pnpm test:e2e`). `scripts/` — the PWA icon, splash and screenshot generators.

Commands: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (`test:unit`, `test:integration`).

## Feature layout

Every feature in `src/features/<feature>/` uses the same layer folders as `apps/admin`, so you can open any of them and know where things are:

| Folder        | Holds                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/`        | `<feature>Api.ts` (the `apiClient` calls), `<feature>Schemas.ts` (Zod schemas for the responses) and server-side fetchers (`get<Thing>Server.ts`). |
| `components/` | Pages, sections and modals, one PascalCase component per file.                                                                                     |
| `hooks/`      | One hook per file (`useInfiniteOrders.ts`).                                                                                                        |
| `schemas/`    | Form validation schemas (`register.schema.ts`).                                                                                                    |
| `constants/`  | Named values, labels, lookup maps and query keys.                                                                                                  |
| `utils/`      | Pure helpers with no React.                                                                                                                        |
| `types/`      | Shared type shapes, where a feature has them.                                                                                                      |
| `context/`    | React context providers, where a feature has them (`auth`, `landing`).                                                                             |
| `testing/`    | Fixtures shared by a feature's tests (`outfit-build`).                                                                                             |

A feature only has the folders it needs. `index.ts` (when other features import from it) and `README.md` stay at the feature root. Each test sits beside the file it covers, as `<name>.test.ts(x)` or `<name>.integration.test.tsx`. No component lives in an `index.tsx`.

**Large features are split into topic folders**, each with the same layer folders inside. `creator-dashboard/` has `badges/`, `challenges/`, `earnings/`, `share-links/`, `looks/` and `progress/`; `brand-dashboard/` has `products/`, `shipments/`, `tag-reviews/` and `wallet/`; `explore/` has `feed/`, `posts/`, `comments/` and `suggestions/`; `outfit-build/` has `board/`, `my-builds/`, `publishing/`, `public-builds/` and `social/`; `auth/` has `login/`, `registration/`, `password/`, `oauth/`, `suspension/` and `phone-number/`; `pwa/` has `install/`, `app-manifest/`, `offline/`, `push/` and `service-worker/`. Code shared by several topics stays in the feature root's own layer folders. Topic folders are kebab-case; files keep React naming (PascalCase components, camelCase everything else).

## The dashboard sidebar has a staff menu

Most dashboard pages send staff to the admin panel, but build pages and account settings do not, so staff can still land on the sidebar. `components/useDashboardNav.ts` gives them a short menu with a link back to the admin panel instead of the shopper menu. Staff who are also creators keep the muse menu.

## Forms never submit natively

Pages are rendered on the server, so a form is on screen before its JavaScript has loaded. On a slow phone connection that can take a long time, and a form with no `method` that is submitted in that gap is sent by the browser as a GET, with every field in the URL, password included. A URL ends up in browser history, server logs and analytics.

`src/shared/lib/nativeFormSubmitGuard.ts` is a small inline script in the root layout that stops any submit from a form with no `action`. It stays on after the page has loaded, because every form here already handles its own submit. A tap on Sign in before the page is ready does nothing, and the shopper taps again once it is. The script is allowed by its hash in `contentSecurityPolicy.ts`, so changing it means changing the hash too, and a test checks the two match. A form that really should post natively, like the eSewa redirect, sets an `action` and is left alone.
