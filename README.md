# Outfiqe

Node.js + React monorepo, structured as a modular monolith so it can move fast now and split into separate services later without a rewrite.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** Node 22, Express 5, Zod, Prisma 7 + PostgreSQL 16
- **Web:** Next.js 16 (App Router, SSR/ISR), React 19, TanStack Query
- **Language:** TypeScript

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Start Postgres
docker compose up -d

# 4. Set up the database
pnpm --filter @outfiqe/api db:generate   # generate the Prisma client
pnpm --filter @outfiqe/api db:migrate    # create/apply schema
pnpm --filter @outfiqe/api db:seed       # optional demo user

# 5. Run the app
pnpm dev
```

- API: [http://localhost:4000](http://localhost:4000)
- Web: [http://localhost:3000](http://localhost:3000)

## Project Structure

```
apps/
  api/            Express API (modular monolith — one folder per domain)
  web/            Next.js storefront (App Router) — features mirror the API's modules,
                   routed via app/. SSR/ISR by default, for SEO.
packages/
  shared-types/   Types shared between api and web
docker-compose.yml  Local Postgres
```

## SEO

`apps/web` is a real SSR app, not a client-rendered SPA — search engines and
social-share crawlers get fully-rendered HTML, not an empty `<div>`.

- Per-page `metadata` (title/description) — see `app/layout.tsx` (site-wide
  default + template) and `app/login/page.tsx` (per-page override).
- `app/sitemap.ts` / `app/robots.ts` — generated routes, not static files.
  Extend `sitemap.ts` with product/category URLs once those exist.
- New pages that need their own title/description just export a `metadata`
  object (static) or `generateMetadata()` (dynamic, e.g. per-product) —
  [Next's metadata docs](https://nextjs.org/docs/app/getting-started/metadata-and-og-images).

## Database Scripts

Run from `apps/api` (or via `pnpm --filter @outfiqe/api <script>`):

| Script        | Purpose                                   |
| ------------- | ----------------------------------------- |
| `db:migrate`  | Create + apply a migration (dev)          |
| `db:deploy`   | Apply existing migrations (CI/production) |
| `db:generate` | Regenerate the Prisma client              |
| `db:seed`     | Seed demo data                            |
| `db:studio`   | Browse the database in Prisma Studio      |

## Environment Variables

| File            | Used by              | Notes                                                                                             |
| --------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `.env`          | `docker-compose.yml` | Postgres credentials                                                                              |
| `apps/api/.env` | API                  | `DATABASE_URL`, `JWT_SECRET`, token TTLs                                                          |
| `apps/web/.env` | Web                  | `API_URL`, `SITE_URL` — both server-only (no `NEXT_PUBLIC_` prefix), never shipped to the browser |

`.env` files are gitignored; only the `.env.example` templates are committed.

### GitHub Variables (CI only)

CI has no database, so `.github/workflows/ci.yml` reads placeholder values for
`prisma generate`/`tsc` from repo **Settings → Secrets and variables →
Actions → Variables**. These are not secrets — nothing they point to is a
real, reachable service — so they're set as Variables, not Secrets. The
workflow falls back to a working default even if they're never set; create
them only if you want to change what CI uses.

| Variable          | Example value                                                          |
| ----------------- | ---------------------------------------------------------------------- |
| `CI_DATABASE_URL` | `postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_db?schema=public` |
| `CI_JWT_SECRET`   | any string ≥ 16 characters                                             |
| `CI_API_URL`      | `http://localhost:4000` (workflow default, rarely needs overriding)    |
| `CI_SITE_URL`     | `http://localhost:3000` (workflow default, rarely needs overriding)    |

Via `gh` CLI instead of the UI:

```bash
gh variable set CI_DATABASE_URL --body "postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_db?schema=public"
gh variable set CI_JWT_SECRET --body "ci-placeholder-secret-not-used-for-anything-real"
```

## Code Quality & Commits

- `pnpm lint` / `pnpm format` — ESLint (flat config, shared across all packages) and Prettier.
- **Pre-commit:** staged files are auto-linted and formatted (Husky + lint-staged).
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org), enforced by a commit-msg hook (commitlint, config in `commitlint.config.js`):

  ```
  <type>(<scope>): <subject, lower-case, no trailing period>

  feat(web): add user profile page
  fix(api): correct password hash comparison
  docs: update setup instructions
  ```
  - **Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, `revert`.
  - **Scope** is optional, but if given must be one of `api`, `web`, `shared-types`, `deps`, `config`, `ci`, `release` — the package scopes are derived automatically from `apps/*` and `packages/*` in `commitlint.scopes.cjs`, so a new package becomes a valid scope with no config change.

  Hooks run automatically via `pnpm install` (the `prepare` script sets them up) — no manual step needed.

## Status

MVP — auth is functional (signup/login, hashed passwords, JWT) but has no refresh-token store or `requireAuth` middleware yet, and there's no test suite wired up. Not production-ready.
