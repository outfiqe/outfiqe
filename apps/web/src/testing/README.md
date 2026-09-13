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
- **The `JavaScript heap out of memory` crash that plagued this suite for a long stretch was a real,
  fixed bug, not a resource-scarcity problem.** `ExploreFeed.authTiming.integration.test.tsx`
  mocked `next/navigation` as `useRouter: () => ({ replace: vi.fn(), push: vi.fn() })` — a factory
  that hands back a **new object on every call**, instead of the shared `mockNextRouter()` helper's
  `vi.mocked(useRouter).mockReturnValue(...)` (same stable reference every call). `AuthContext.tsx`'s
  session-resolution `useEffect` depends on that router value (`[router]`), and its body ends in a
  `dispatch(...)` that changes state, which re-renders `AuthProvider`, which calls `useRouter()`
  again, which returns a new object, whose changed identity re-fires the effect — a genuine infinite
  render loop with no natural exit, burning memory forever rather than converging. Confirmed by
  bisecting the file down to `renderHook(() => useExploreAuthGate())` alone (no feed hook, no
  component tree) still reproducing the exact same crash in under 20 seconds once the runner's heap
  ceiling was turned down to make it fail fast instead of after several minutes. Fixed by mocking
  `useRouter`/`useSearchParams` as plain `vi.fn()`s and configuring them with `mockNextRouter()` /
  `.mockReturnValue(new URLSearchParams())` in `beforeEach`, the same pattern every other
  `AuthProvider`-rendering integration test in this app already uses. The full suite (unsharded,
  default worker count) now runs clean in a few minutes with no crash.
- **Everything below this point was the investigation trail before that root cause was found, kept
  for the record — the workarounds it produced (`maxWorkers: 1`, `vmMemoryLimit`, the 3-way
  `--shard` split in `test:integration`) may now be unnecessary and are worth re-evaluating, but
  haven't been stripped out yet.** `test:integration` (`package.json`) runs the `integration`
  project as three separate `vitest run --shard` invocations chained with `&&`, instead of one;
  `vitest.config.ts` also caps `maxWorkers: 1` and sets `execArgv: ["--max-old-space-size=3072"]`.
  CI's runner (`runs-on: ubuntu-latest`, the standard GitHub-hosted spec — fixed at roughly 2 vCPU /
  7GB RAM regardless of billing plan, unless the org pays for larger runners) crashed the suite with
  `JavaScript heap out of memory` partway through the run, at consistent points across reruns.
  Tried first, based on a wrong assumption that this was a gradual per-file leak: `maxWorkers: 2`
  (still crashed, just later); `maxWorkers: 1` (still crashed — the single worker sat idle for ~5
  minutes doing GC, "Ineffective mark-compacts near heap limit", before dying); `vmMemoryLimit`
  (meant to recycle a worker before it exhausts memory) at `"1gb"` then `"384mb"` (no effect either
  time); a 2-way `--shard` split (**still** crashed, at 25/26 files — nearly the same _fraction_
  through the run as the unsplit suite crashed at). At the time this looked like it pointed at the
  runner's total system memory rather than a growing leak — reasonable given the evidence available,
  but wrong: the real cause was one file's infinite loop poisoning the single shared worker process
  for the rest of whatever ran in it, which happens to look similar to "crashes near the end
  regardless of size" when the offending file runs early and the loop needs a while to exhaust
  whatever heap ceiling is configured. `3072` MB / `8192` MB genuinely just changed how long the
  loop took to finish the job.
- Not colocated with a single source file, unlike `<name>.test.tsx` files: `mswServer` is one
  shared instance reused by every integration test in the app, and `setup.ts` is wired in as a
  vitest config-level `setupFiles` entry, which has to be a real file path.
- Lives under `src/testing/`, not a separate top-level `test/`, so it's colocated at the app level
  (everything under `src/`) even though it isn't colocated at the file level.
- `createQueryClientWrapper()`/`createTestQueryClient()` return a **new** instance on every call
  rather than one shared module-level `QueryClient` — call it fresh per test (or per `renderHook`
  call) so mutation/query state from one test can't leak into the next via a shared cache, the same
  isolation `afterEach(cleanup)` gives the React tree itself.
