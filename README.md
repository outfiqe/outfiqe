# Outfiqe

Outfiqe is a fashion marketplace where shoppers buy from brands, muses (creators) post shoppable
looks, and brands run their store, orders and customer relationships in one place. This repository
holds the whole platform: the API, the shopper-facing web app, the internal admin panel, and the
packages they share.

## Contents

- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Everyday commands](#everyday-commands)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [How we work](#how-we-work)
- [Product vocabulary](#product-vocabulary)
- [Admin access](#admin-access)
- [SEO](#seo)
- [Where to find documentation](#where-to-find-documentation)
- [Engineering standards](#engineering-standards)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Architecture

Outfiqe is a **modular monolith**. There is one API, but every business area (orders, products,
auth, logistics, CRM and so on) lives in its own module with its own routes, services, data access
and README. Modules talk to each other through each other's public service, never through another
module's database tables, so any of them can later move into a separate service without a rewrite.

```
            ┌──────────────┐        ┌──────────────┐
 Shoppers → │  apps/web    │        │  apps/admin  │ ← Outfiqe staff
 Brands   → │  Next.js     │        │  Vite+React  │
 Muses    → └──────┬───────┘        └──────┬───────┘
                   │      HTTPS + cookies  │
                   └──────────┬────────────┘
                       ┌──────▼───────┐
                       │  apps/api    │  Express, one module per business area
                       └──┬────────┬──┘
                 ┌────────▼──┐  ┌──▼──────────────┐
                 │ PostgreSQL │  │ Redis           │  cache, rate limits, Socket.IO,
                 │ (Prisma)   │  │                 │  Redis Streams for domain events
                 └────────────┘  └─────────────────┘
```

- **One sign-in for every app.** Users sign in on the web app. The admin panel has no login page of
  its own and reuses the same session.
- **Domain events** such as a new order, a like or a signup travel over Redis Streams, so a crash or
  restart never silently drops one.
- **One codebase, several process roles.** The same API code can run as the HTTP server, a
  background worker or a scheduler, chosen with `PROCESS_ROLE`
  (see [apps/api/src/processes/README.md](apps/api/src/processes/README.md)).
- **Hosting.** The API runs as a Docker image behind Caddy (see
  [deploy/README.md](deploy/README.md)). The web app and admin panel are deployed on Vercel.

## Tech stack

| Area     | Technology                                                               |
| -------- | ------------------------------------------------------------------------ |
| Language | TypeScript everywhere                                                    |
| Monorepo | pnpm workspaces and Turborepo                                            |
| API      | Node.js 22, Express 5, Zod, Prisma 7, PostgreSQL 16, Redis 7, Socket.IO  |
| Web      | Next.js 16 (App Router, server rendering), React 19, TanStack Query      |
| Admin    | React 19 with Vite, TanStack Router, TanStack Query                      |
| UI       | Shared design system built on Radix UI and Tailwind CSS                  |
| Testing  | Vitest (unit and integration), React Testing Library, Playwright         |
| Quality  | ESLint, Prettier, Husky, lint-staged, commitlint                         |
| Ops      | GitHub Actions, Docker, Sentry for errors, PostHog for product analytics |

## Repository layout

```
apps/
  api/              The backend. One folder per business area under src/modules/.
  web/              The public site and the shopper, muse and brand dashboards.
  admin/            The internal panel for Outfiqe staff.
packages/
  client/           API client used by web and admin (tokens, CSRF, session renewal).
  components/       Shared layout pieces such as the header bar and sidebar.
  design-system/    UI building blocks and theme tokens for web and admin.
  error-boundary/   The shared error screen and retry behaviour for web and admin.
  hooks/            Shared React hooks.
  image-pipeline/   Background processing for uploaded images.
  types/            TypeScript types shared by api, web and admin.
  utils/            Small shared helpers and constants.
deploy/             Production Docker Compose files, Caddy config and deploy notes.
docs/               Product requirement documents and build plans.
docker-compose.yml  Local Postgres and Redis (plus separate test instances).
```

Every app, package and module has its own `README.md` that explains its purpose, its files and how
a request moves through it.

## Getting started

### Prerequisites

- Node.js 22
- pnpm 11 (`corepack enable` picks up the version pinned in `package.json`)
- Docker Desktop, or Docker Engine with Compose

### 1. Install and configure

```bash
pnpm install

cp .env.example .env
cp apps/api/.env.local.example apps/api/.env.local
cp apps/web/.env.local.example apps/web/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
```

### 2. Add the local domain

The app must run on `outfiqe.local`, not `localhost`. The session cookie is shared across
subdomains (for example `meridian.outfiqe.local` for a brand's CRM), and browsers refuse to share
a cookie across subdomains of a single-word host like `localhost`.

Add these lines to your hosts file. On Windows it is
`C:\Windows\System32\drivers\etc\hosts`; open your editor as Administrator. On macOS and Linux it is
`/etc/hosts`; edit it with `sudo`. The change takes effect immediately.

```
127.0.0.1 outfiqe.local
127.0.0.1 daraz.outfiqe.local
127.0.0.1 meridian.outfiqe.local
127.0.0.1 norday.outfiqe.local
```

Add one more line for each brand CRM you create locally. In your `.env.local` files, set
`TENANT_BASE_DOMAIN`, `FRONTEND_URL`, `ADMIN_URL`, `OAUTH_REDIRECT_BASE_URL` and the admin app's
`VITE_WEB_URL` to `outfiqe.local` addresses. For how subdomains map to brands, see
[apps/api/src/modules/crm-access/README.md](apps/api/src/modules/crm-access/README.md).

### 3. Start the database and run the app

```bash
docker compose up -d                       # Postgres and Redis

pnpm --filter @outfiqe/api db:generate     # generate the Prisma client
pnpm --filter @outfiqe/api db:migrate      # create the schema
pnpm --filter @outfiqe/api db:seed         # optional demo data

pnpm dev
```

| App   | Address                         | Notes                                                            |
| ----- | ------------------------------- | ---------------------------------------------------------------- |
| API   | http://outfiqe.local:4000       |                                                                  |
| Web   | http://outfiqe.local:3000       |                                                                  |
| Admin | http://outfiqe.local:3000/admin | Opened through the web app. Sign in there with an admin account. |

## Everyday commands

Run these from the repository root. Turborepo runs each task in every app and package that has it.

| Command                 | What it does                                         |
| ----------------------- | ---------------------------------------------------- |
| `pnpm dev`              | Start every app in development mode                  |
| `pnpm build`            | Build every app and package                          |
| `pnpm typecheck`        | Type-check the whole repository                      |
| `pnpm lint`             | Run ESLint everywhere                                |
| `pnpm format`           | Format every file with Prettier                      |
| `pnpm test`             | Run unit and integration tests                       |
| `pnpm test:unit`        | Run unit tests only                                  |
| `pnpm test:integration` | Run integration tests only (needs the test database) |

To work on one app, add a filter, for example `pnpm --filter @outfiqe/web test`.

### Database

Run these with `pnpm --filter @outfiqe/api <script>`.

| Script        | What it does                                  |
| ------------- | --------------------------------------------- |
| `db:migrate`  | Create and apply a migration (development)    |
| `db:deploy`   | Apply existing migrations (CI and production) |
| `db:generate` | Regenerate the Prisma client                  |
| `db:seed`     | Load demo data                                |
| `db:studio`   | Browse the database in Prisma Studio          |

## Environment variables

| File                    | Used by                  | What it holds                                                                                                     |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `.env`                  | `docker-compose.yml`     | Local Postgres credentials                                                                                        |
| `apps/api/.env.local`   | API in development       | Everything in `apps/api/src/config/env.config.ts`. Every variable is required; there are no defaults in the code. |
| `apps/api/.env.test`    | API integration tests    | Safe test values, pointing at the test database                                                                   |
| `apps/web/.env.local`   | Web app in development   | App environment, API address, site address and admin address                                                      |
| `apps/admin/.env.local` | Admin app in development | App environment and the web address used for sign-in                                                              |
| `deploy/.env.prod`      | Production               | Lives only on the server. See [deploy/README.md](deploy/README.md).                                               |

`.env` files are never committed. Only the `*.example` templates are.

Three variables describe how the API runs:

- `NODE_ENV` is the Node.js mode. Both staging and production builds run with `production`.
- `APP_ENV` (`local`, `dev` or `prod`) says which environment this is. Logging, secure cookies, HSTS
  and error-reporting tags depend on it.
- `PROCESS_ROLE` (`all`, `api`, `worker` or `scheduler`) chooses which part of the API a process
  runs.

**CI configuration.** GitHub Actions gets the same variables from the repository's
**Settings → Secrets and variables → Actions**. Plain values are stored as variables (`CI_*`) and
anything that looks like a credential as a secret, even though CI only uses test values, so nothing
sensitive appears in logs. Every name referenced in `.github/workflows/ci.yml` must exist, or the
test jobs fail at start-up.

## Testing

Every change that adds or changes behaviour ships with its tests in the same pull request.

- **Unit tests** cover functions, services, hooks and components in isolation. They sit next to
  the file they test as `*.test.ts` or `*.test.tsx`.
- **Integration tests** run against a real Postgres and Redis (`*.integration.test.ts`). Start the
  test database with `pnpm --filter @outfiqe/api test:db:up`.
- **Component tests** render web and admin components with React Testing Library.
- **Browser tests** run the built web app in Playwright.

In CI the API's integration tests are split across four machines that run at the same time, each
with its own database. A coverage check (80% of lines, functions, branches and statements) runs on
every release pull request.

## How we work

### Branches

- `dev` is where work comes together. Open every pull request against `dev`.
- `main` is the release branch. It only receives the `dev` → `main` release pull request, and a
  merge to `main` deploys to production.
- Name branches `<type>/<short-description>`, for example `feat/creator-onboarding` or
  `fix/checkout-address-overflow`. The type is one of the commit types below.

### Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org). A hook checks every
commit message.

```
<type>(<scope>): <lower-case subject, no full stop>

feat(web): add the size guide to product pages
fix(api): reject an expired password reset link
```

- **Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `style`,
  `revert`.
- **Scope** is optional. It is an app or package name (`api`, `web`, `admin`, `client`,
  `design-system` and so on) or one of `deps`, `config`, `ci`, `release`.

Staged files are linted and formatted automatically before each commit. The hooks are installed by
`pnpm install`.

### Pull requests and releases

1. Open a pull request into `dev`. CI runs lint, type checks, the build, every test suite, an API
   start-up check and Lighthouse.
2. Merge when CI is green.
3. To release, open a pull request from `dev` into `main` and merge it with **Create a merge
   commit**. Never squash it: a squashed release copies `dev`'s commits under new ids, and the next
   release then conflicts with itself.

Full details of every workflow are in [.github/workflows/README.md](.github/workflows/README.md).

### API reference

`apps/api/openapi/openapi.json` describes every API endpoint: its fields, who can call it, its
errors and example responses. It is generated from the running code, never written by hand.

- When you change a route, request schema, guard or module README, the pre-commit hook regenerates
  the file. You can also run `pnpm --filter @outfiqe/api docs:openapi`.
- CI fails if the committed file does not match the code.
- To refresh the example responses after an endpoint's response changed, start **Refresh API
  examples** from the Actions tab. It records fresh examples and opens a pull request with them.
- When the file reaches `main`, the API tab on the team docs site rebuilds automatically.

See [apps/api/src/testing/openapi/README.md](apps/api/src/testing/openapi/README.md) for how it
works.

## Product vocabulary

Everything a user reads uses Outfiqe's own words. Code, routes, API shapes and the database keep
the original names. Use the left column in copy and the right column in code.

| Users see         | Code, routes, database and enums say                      |
| ----------------- | --------------------------------------------------------- |
| Muse              | creator (`/creator/[handle]`, `CreatorLook`, `isCreator`) |
| Drop              | post or look (`CREATOR_LOOK`, `PostCard`)                 |
| Cheriq / cheriqed | like (`LOOK_LIKED`, `isLiked`, `likeCount`)               |
| Chime / chimed on | comment (`LOOK_COMMENTED`, `CommentThread`)               |
| Stash / stashed   | save and wishlist (`isSaved`, `/wishlist`)                |
| Share             | share                                                     |

These words only apply to the social actions. A form's "Save changes" button, saved addresses, CRM
ticket comments and HTTP `POST` keep their usual meaning.

## Admin access

- **Signing in.** The admin panel has no sign-up and no login page of its own. Staff sign in on the
  web app, and an admin account is sent straight to the panel with the same session. Opening the
  panel while signed out sends you to sign in first.
- **The first admin** in a new environment is created by the API when it starts, from
  `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` and `ADMIN_BOOTSTRAP_PHONE` in
  `apps/api/.env.local`. Set all three, start the API once, then remove them or change the
  password.
- **More admins** are invited from the **Team** page in the panel.
- **Brand applications** are approved in the panel. Approving one creates the brand and emails the
  applicant a link to set up their account.

## SEO

The web app renders pages on the server, so search engines and link previews receive complete
HTML.

- Each page sets its title and description with Next.js `metadata` or `generateMetadata()`.
- `app/sitemap.ts` and `app/robots.ts` generate the sitemap and robots rules.
- Public pages include structured data where it applies, such as products and brands.

## Where to find documentation

| You want to know                               | Look here                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| How a module, app or package works and why     | The `README.md` in that folder                                             |
| The rules every change follows                 | [CLAUDE.md](CLAUDE.md)                                                     |
| How CI, deploys and releases work              | [.github/workflows/README.md](.github/workflows/README.md)                 |
| Every API endpoint                             | The API tab on ops.outfiqe.com, built from `apps/api/openapi/openapi.json` |
| How shoppers, muses and brands use the product | docs.outfiqe.com                                                           |
| Guides for riders, the hub and Outfiqe staff   | ops.outfiqe.com (team sign-in required)                                    |
| Product requirements and build plans           | [docs/](docs/)                                                             |

There are no code comments in this repository. Names and structure explain what code does, and the
module README explains why.

## Engineering standards

Outfiqe serves real customers and real money, so every change is held to production standards:

- **Security.** Passwords are hashed. Sessions use short-lived access tokens and a database-backed,
  hashed, rotating refresh token, with reuse detection. Every protected route checks access on the
  server. Inputs are validated, write endpoints are rate limited, and the auth rules follow OWASP
  ASVS.
- **Reliability.** Domain events go through Redis Streams with consumer groups. Anything stuck is
  reclaimed, and after five failed attempts a message moves to a dead-letter stream instead of
  retrying forever. Real-time connections reconnect with backoff. A failing optional dependency,
  such as a cache read, degrades gracefully instead of failing the request.
- **Data integrity.** Database constraints guard against races, and related writes share one
  transaction.
- **User experience.** Every list has loading, empty and error states. Pages are accessible
  (keyboard use, labels, contrast, reduced motion) and checked at phone sizes.
- **Tests and review.** Every pull request runs the full CI gate before it can merge.

## Troubleshooting

- **`next dev` fails with `ERR_SWC_NATIVE_CACHE` on Windows.** Turborepo only passes the
  environment variables listed in `turbo.json`. `LOCALAPPDATA` is listed in `globalPassThroughEnv`
  because Next.js's compiler needs it to find its cache folder. If you changed that list, add it
  back.
- **Signed out straight after signing in.** You are probably on `localhost`. Use
  `http://outfiqe.local:3000` and check the hosts file entries above.
- **Integration tests cannot connect to the database.** Start the test containers with
  `pnpm --filter @outfiqe/api test:db:up`.

## License

Proprietary. All rights reserved. See [LICENSE](./LICENSE). This is not open-source software. No
permission is granted to use, copy, modify or distribute any part of this repository without an
explicit written agreement with Outfiqe.
