# Testing infra

## Purpose

Shared test harness for `apps/web` — the pieces every test needs that aren't specific to one
component/hook/util, so they live here instead of being duplicated across test files.

## Structure

- `setup.ts` — vitest `setupFiles` shared by both the `unit` and `integration` projects (e.g.
  jest-dom matchers for jsdom).
- `integration/setup.ts` — additional `setupFiles` for the `integration` project only: starts the
  MSW server before the suite, resets its handlers after each test, closes it after the suite.
- `integration/msw/server.ts` — the shared `setupServer()` instance (`mswServer`) that integration
  tests register per-test request handlers against via `mswServer.use(...)`.
- `integration/queryClientWrapper.tsx` — `createQueryClientWrapper()` builds a fresh
  `QueryClientProvider` wrapper (retries off) for `renderHook`/`render`; `createTestQueryClient()`
  is the underlying factory for feature-local wrapper variants (e.g. `useAuth`'s tests also need
  `AuthProvider` — see `apps/web/src/features/auth/context/authTestWrapper.tsx`) to build on without
  duplicating the `QueryClient` config.
- `integration/mockRouter.ts` — `mockNextRouter()` mocks `next/navigation`'s `useRouter()` return
  value and hands back its `replace` spy; call it from `beforeEach` after the test file's own
  `vi.mock("next/navigation", ...)` so each test gets a fresh mock instead of one shared across the
  file.

Reached from anywhere in `src/` via the `@test/*` path alias (`vitest.config.ts`'s `resolve.alias`,
`tsconfig.json`'s `paths`), e.g. `import { mswServer } from "@test/integration/msw/server"`.

## Funnel

An integration test (colocated as `<name>.integration.test.tsx` next to the hook/component it
exercises) imports `mswServer` and calls `mswServer.use(http.get(...))` etc. _inside the test file
itself_ to mock the specific endpoint(s) it needs — only the shared server instance and its
start/reset/stop lifecycle live here, not the mocked endpoints themselves.

## Non-obvious rationale

- Not colocated with a single source file, unlike `<name>.test.tsx` files: `mswServer` is one
  shared instance reused by every integration test in the app, and `setup.ts` is wired in as a
  vitest config-level `setupFiles` entry, which has to be a real file path.
- Lives under `src/testing/`, not a separate top-level `test/`, so it's colocated at the app level
  (everything under `src/`) even though it isn't colocated at the file level.
- `createQueryClientWrapper()`/`createTestQueryClient()` return a **new** instance on every call
  rather than one shared module-level `QueryClient` — call it fresh per test (or per `renderHook`
  call) so mutation/query state from one test can't leak into the next via a shared cache, the same
  isolation `afterEach(cleanup)` gives the React tree itself.
