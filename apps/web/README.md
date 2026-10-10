# @outfiqe/web

## Purpose

The public Outfiqe site and the signed-in shopper, creator and brand dashboards, built with Next.js (App Router). It also ships as an installable, offline-capable PWA (`src/features/pwa`).

## Structure

- `src/app/` — routes. A route file loads data and composes feature components; it holds no feature logic of its own. `src/app/(home)/README.md` explains how the homepage is put together.
- `src/features/<feature>/` — one folder per product area (see "Feature layout" below). Each has its own `README.md`.
- `src/components/` — app-wide chrome shared by many routes: the site header and footer, the dashboard sidebar and mobile nav, and modals such as followers/following.
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
