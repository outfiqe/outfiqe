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

- **The `integration` project sets `testTimeout: 10000` (`vitest.config.ts`), doubling vitest's
  5000ms default; the `unit` project keeps the default.** Integration tests do real rendering, real
  `QueryClientProvider`/MSW request round trips, and real `act()`-flushed effect chains — meaningfully
  more work per test than a pure unit test, and `turbo run test` runs this project's tests
  concurrently with `@outfiqe/api#test` (a CPU/DB-heavy, single-worker-serial suite — see
  `apps/api/src/testing/README.md`), which can starve this project's worker of CPU time on a
  constrained machine. A handful of integration tests were intermittently hitting the 5000ms default
  under that contention, including ones with no timer or network call in them at all — evidence the
  issue was scheduler starvation, not any one slow operation. Matches the same reasoning
  `apps/api/vitest.config.ts`'s integration project already applies with its own (larger, DB-bound)
  `testTimeout: 15000`.
- **The `integration` project caps `maxWorkers: 1` (`vitest.config.ts`).** Each worker boots a real
  jsdom environment plus MSW's interceptors and renders full pages behind `AuthProvider`/
  `QueryClientProvider` — heavier per-file than a plain unit test. At vitest's default worker count
  (one per CPU core), the CI runner's suite crashed with `JavaScript heap out of memory` partway
  through the run; the crash point was identical across repeated reruns, pointing at a real
  concurrent-memory ceiling rather than a one-off flake. `maxWorkers: 2` still crashed, just later
  in the run — memory clearly also accumulates across sequential files within one worker, not only
  across concurrent workers — so this runs the whole project in a single worker. Trades real
  wall-clock time for not OOM-crashing the run; worth revisiting (raising the per-worker Node heap
  ceiling via CI's own `NODE_OPTIONS` is the more scalable long-term fix, but that's a repo-wide
  CI config change outside a single app's `vitest.config.ts`) if this suite keeps growing.
- Not colocated with a single source file, unlike `<name>.test.tsx` files: `mswServer` is one
  shared instance reused by every integration test in the app, and `setup.ts` is wired in as a
  vitest config-level `setupFiles` entry, which has to be a real file path.
- Lives under `src/testing/`, not a separate top-level `test/`, so it's colocated at the app level
  (everything under `src/`) even though it isn't colocated at the file level.
- `createQueryClientWrapper()`/`createTestQueryClient()` return a **new** instance on every call
  rather than one shared module-level `QueryClient` — call it fresh per test (or per `renderHook`
  call) so mutation/query state from one test can't leak into the next via a shared cache, the same
  isolation `afterEach(cleanup)` gives the React tree itself.
