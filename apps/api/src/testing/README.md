# Testing infra

## Purpose

Shared test harness for `apps/api` — the pieces an integration test needs that aren't specific to
any one module, so they live here instead of being duplicated into every integration test file.

## Structure

- `integration/testApp.ts` — a `createApp()` Express instance for `supertest` to send requests
  against directly (no real server/port needed).
- `integration/authHelpers.ts` — `createAdminSession()`: creates a real admin `User` row and a real
  JWT, for tests that need to hit an admin-only route.
- `integration/setup.ts` — vitest `setupFiles` for the `integration` project: fails fast if
  `TEST_DATABASE_URL` isn't set, runs pending Prisma migrations before the suite, truncates every
  table after each test, and disconnects Prisma/Redis after the suite.

Reached from anywhere in `src/` via the `#test/*` subpath import (see `package.json`'s `imports`),
e.g. `import { testApp } from "#test/integration/testApp.js"`.

## Funnel

An integration test (colocated as `<module>.integration.test.ts` next to the module it exercises)
imports `testApp` and, if it needs to be authenticated, `createAdminSession`; `supertest(testApp)`
sends a real HTTP request through the real Express app, middleware, and a real (test) database.
`integration/setup.ts` resets the database between tests so each test starts from a clean slate.

## Non-obvious rationale

- This isn't colocated with a single source file the way `<name>.test.ts` files are: `testApp` and
  `createAdminSession` are reused by every integration test in the app (not just the one module
  that currently has one), and `setup.ts` is wired in as a vitest config-level `setupFiles` entry,
  which has to be a real file path — it can't be attached to one source file.
- Lives under `src/testing/`, not a separate top-level `test/`, specifically so it's colocated at
  the app level (everything under `src/`) even though it isn't colocated at the file level. It's
  excluded from the production build (`tsconfig.json`'s `exclude`) and only type-checked/run as
  part of the `tsconfig.test.json` / `vitest` test projects.
- `authHelpers.ts` sits under `integration/`, not directly in `src/testing/`, because it does real,
  integration-only things (writes a DB row, mints a real JWT) — a unit test should never need it.
