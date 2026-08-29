# Outfiqe

Node.js + React monorepo, structured as a modular monolith so it can move fast now and split into separate services later without a rewrite.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** Node 22, Express 5, Zod, Prisma 7 + PostgreSQL 16
- **Web:** Next.js 16 (App Router, SSR/ISR), React 19, TanStack Query
- **Admin:** React 19 + Vite, TanStack Query, axios — internal panel for reviewing brand
  applications, approving creators, and managing admin access
- **Language:** TypeScript

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env

# 3. Add outfiqe.local to your hosts file (see "Local domain setup" below) — required, the
#    session cookie can't be shared across subdomains on a bare "localhost"

# 4. Start Postgres
docker compose up -d

# 5. Set up the database
pnpm --filter @outfiqe/api db:generate   # generate the Prisma client
pnpm --filter @outfiqe/api db:migrate    # create/apply schema
pnpm --filter @outfiqe/api db:seed       # optional demo user

# 6. Run the app
pnpm dev
```

- API: [http://outfiqe.local:4000](http://outfiqe.local:4000)
- Web: [http://outfiqe.local:3000](http://outfiqe.local:3000)
- Admin: reached through Web at [http://outfiqe.local:3000/admin](http://outfiqe.local:3000/admin)
  — no login form of its own, sign in via Web and it redirects you here if your account is
  `ADMIN`; see "Admin access" below
- Always use `outfiqe.local`, not `localhost` — see "Local domain setup"

### Local domain setup

When filling in `apps/api/.env` and `apps/admin/.env` from their `.env.example` templates, set
`TENANT_BASE_DOMAIN`, `FRONTEND_URL`, `ADMIN_URL`, `OAUTH_REDIRECT_BASE_URL`, and
`VITE_WEB_URL` (`apps/admin`) to `outfiqe.local` (with the right port), not bare `localhost`. This
isn't cosmetic — the session cookie is scoped to `TENANT_BASE_DOMAIN`
(`domain: env.TENANT_BASE_DOMAIN` in `apps/api/src/shared/utils/cookie.utils.ts`) so one login is
shared across every CRM tenant subdomain (`daraz.outfiqe.local`, `meridian.outfiqe.local`, …), the
same way a real deployment shares a session across `daraz.outfiqe.com`/`meridian.outfiqe.com`.
Browsers refuse to honor a `Domain=` cookie on a single-label host like `localhost` (the same
supercookie-prevention rule that blocks scoping a cookie to bare `com`), so this genuinely can't be
tested — or run day to day — on plain `localhost`.

Add these lines to your hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows — open your
editor **as Administrator** or the save will be rejected; `/etc/hosts` on macOS/Linux — use `sudo`)
and add one more line per CRM tenant org you create locally, following the same pattern:

```
127.0.0.1 outfiqe.local
127.0.0.1 daraz.outfiqe.local
127.0.0.1 meridian.outfiqe.local
127.0.0.1 norday.outfiqe.local
```

No service restart needed for the hosts file itself — it takes effect immediately. See
`apps/api/src/modules/crm-access/README.md`'s "Non-obvious rationale" for how subdomain resolution
itself works end to end.

## Project Structure

```
apps/
  api/            Express API (modular monolith — one folder per domain)
  web/            Next.js storefront (App Router) — features mirror the API's modules,
                   routed via app/. SSR/ISR by default, for SEO.
  admin/          Vite + React admin panel — brand application/product review, creator
                   approval, admin team management. No login form — reuses web's session.
packages/
  client/         Typed HTTP client (axios) shared by web + admin
  components/     Shared layout shells — HeaderBar, Sidebar — apps plug in their own router
  design-system/  Design tokens + UI primitives (Button, Input, Modal, Form, ...), the single
                  source of truth for web + admin styling
  hooks/          Shared React hooks (e.g. useInfiniteCursorPage)
  types/          Types shared across api/web/admin (enums, API response envelope)
  utils/          Small runtime helpers shared across api/web/admin (e.g. phone regex)
docker-compose.yml  Local Postgres
```

## Admin access

There's no self-serve signup for the admin panel, and no separate login form either — `apps/admin`
has no `/login` page at all. Signing in always happens on `apps/web`'s `/login`; on success, an
`ADMIN`-role account is sent straight to the admin panel instead of the regular dashboard (same
shared cookie session, just a client-side redirect — see `getDefaultRouteForUser`/`getSafeRedirect`
in `apps/web/src/features/auth`). Visiting the admin panel while signed out bounces you to
`apps/web`'s login and back.

The **first** admin in an environment is created by the API on boot from env vars
(`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`/`ADMIN_BOOTSTRAP_PHONE` in `apps/api/.env`,
see `apps/api/.env.example`) — set all three, start the API once, then unset or rotate the
password. From there, sign in (via `apps/web`) and use **Team** to invite further admins (email +
link, same pattern as brand invites).

Brand applications are approved from the admin panel too — approving one creates a real `Brand`
row and emails the applicant an invite link to set up their account at `apps/web`'s
`/register/brand`. There is no manual CLI step anymore.

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

| File              | Used by              | Notes                                                                                                                                                                                                                                                                                      |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.env`            | `docker-compose.yml` | Postgres credentials                                                                                                                                                                                                                                                                       |
| `apps/api/.env`   | API                  | `DATABASE_URL`, `JWT_SECRET`, token TTLs, `ALLOWED_ORIGINS` (CORS allowlist for web + admin), `TENANT_BASE_DOMAIN` (see "Local domain setup"), `ADMIN_BOOTSTRAP_*` (see "Admin access")                                                                                                    |
| `apps/web/.env`   | Web                  | `API_URL`, `SITE_URL` (server-only) and `NEXT_PUBLIC_ADMIN_URL` (client-exposed — the post-login redirect target for admins)                                                                                                                                                               |
| `apps/admin/.env` | Admin                | `VITE_WEB_URL` (where signed-out visitors get bounced to sign in, sent to the browser bundle). `VITE_API_URL` is optional — `apiClient` defaults to the same-origin `/api`, proxied by `vite.config.ts`'s dev server; only set it to point at a genuinely different, cross-origin API host |

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
| `CI_ADMIN_URL`    | `/admin` (workflow default, rarely needs overriding)                   |

Via `gh` CLI instead of the UI:

```bash
gh variable set CI_DATABASE_URL --body "postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_db?schema=public"
gh variable set CI_JWT_SECRET --body "ci-placeholder-secret-not-used-for-anything-real"
```

## Code Quality & Commits

- `pnpm lint` / `pnpm format` — ESLint (flat config, shared across all packages) and Prettier.
- **Pre-commit:** staged files are auto-linted and formatted (Husky + lint-staged).
- **Branch names:**

  ```
  <type>/<short-kebab-case-description>

  feat/creator-onboarding
  fix/dashboard-role-redirect-flash
  refactor/brand-application-status
  ```
  - **Type** must be one of the same values as commit types below (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, `revert`) — no personal/username branches.
  - No spaces or uppercase; keep the description short.

- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org), enforced by a commit-msg hook (commitlint, config in `commitlint.config.js`):

  ```
  <type>(<scope>): <subject, lower-case, no trailing period>

  feat(web): add user profile page
  fix(api): correct password hash comparison
  docs: update setup instructions
  ```
  - **Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`, `revert`.
  - **Scope** is optional, but if given must match a real workspace folder or one of the cross-cutting scopes — currently `admin`, `api`, `web`, `client`, `components`, `design-system`, `hooks`, `types`, `utils`, `deps`, `config`, `ci`, `release`. These come from `apps/*` and `packages/*` in `commitlint.scopes.cjs`, so a new package becomes a valid scope with no config change.

  Hooks run automatically via `pnpm install` (the `prepare` script sets them up) — no manual step needed.

## Status

This ships to real, public users — "MVP" here means a scoped feature set, not a lower engineering
bar. Auth is production-grade: hashed passwords, short-lived JWT access tokens, and a DB-backed,
hashed, TTL'd, rotating refresh-token store (`apps/api/src/modules/auth`), enforced server-side via
`requireAuth`/`requireRole` middleware across every protected route. The real-time layer (Socket.IO,
`apps/api/src/shared/socket`) uses exponential backoff with jitter on reconnect. Domain events
(likes, follows, new looks, signups) travel over Redis Streams rather than an in-process event
emitter (`apps/api/src/shared/redis`) — consumer groups ack on success, reclaim anything stuck via
`XAUTOCLAIM`, and after 5 failed attempts a message falls into a dead-letter stream instead of
retrying forever. So a crashed handler or a mid-delivery restart doesn't mean a silently dropped
event. Test infra is in place — vitest `unit`/`integration` projects per app, 80% coverage
thresholds, a handful of seeded example tests (`apps/api/src/shared/utils/*.test.ts`,
`apps/web/src/components/ProductGridSkeleton.test.tsx`, `apps/admin/src/components/Logo.test.tsx`,
among others) — but actual coverage is still thin across the codebase; new/changed code is expected
to bring its own unit, integration, and (for web/admin) component tests as it lands.
