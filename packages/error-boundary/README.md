# error-boundary

## Purpose

The shared React error boundary both `apps/web` and `apps/admin` render behind — one fallback UI, one retry/reload policy, used by Next.js's `error.tsx`/`global-error.tsx` convention in `web` and by TanStack Router's `errorComponent` in `admin`.

## Structure

- `AppErrorBoundary.tsx` — wraps `react-error-boundary`'s `ErrorBoundary`. Adds a retry budget (`maxRetries`, default 3 — past that, "Try again" becomes a full page reload instead of another render attempt) and a one-time auto-reload for stale-deploy chunk-load errors, on top of what the library gives you for free.
- `ErrorFallback.tsx` — the actual fallback UI, and `isChunkLoadError`, the regex-based detector both `ErrorFallback` and `AppErrorBoundary` need (kept in one place so the "is this a stale-chunk error" definition can't drift between them).
- `index.ts` — re-exports both components plus `useErrorBoundary` (react-error-boundary's own hook for imperatively surfacing errors caught outside of render — event handlers, async code — that a boundary can't catch on its own).

## Funnel

**User-facing:** a component throws during render → the nearest `AppErrorBoundary` (or, in `web`, Next's own `error.tsx` boundary rendering `ErrorFallback` directly) catches it and shows a short, branded "Something went wrong" card instead of a blank screen or the framework's default error page. If the error looks like a stale JS chunk after a deploy, the page reloads once automatically with no card shown at all. Otherwise: "Try again" re-renders the subtree, "Reload page" does a full reload — and once `maxRetries` "Try again" attempts have failed, "Try again" itself starts doing a full reload instead, so a genuinely broken subtree can't be retried forever.

**Technical:** `apps/web/src/app/error.tsx` and `global-error.tsx` render `ErrorFallback` directly (Next.js already provides the retry function as `reset` and remounts the segment itself, so `AppErrorBoundary`'s own retry-budget/chunk-reload logic would be redundant there). `apps/admin/src/components/RouteError.tsx` does the same, adapting TanStack Router's `ErrorComponentProps` (`{ error, reset }`) to `FallbackProps` — it's wired in via `errorComponent` on `apps/admin/src/routes/__root.tsx`, alongside `RouteNotFound.tsx` (`notFoundComponent`) for genuinely unmatched routes, which isn't a thrown error at all so it doesn't render `ErrorFallback`. Anywhere either app wants a narrower boundary — around one risky subtree instead of the whole route — renders `<AppErrorBoundary>` directly.

## Non-obvious rationale

- **`error` is `unknown`, not `Error`** — react-error-boundary v6 stopped assuming a caught value is always an `Error` instance (`throw "a string"` is valid JS). `getErrorMessage()` (the library's own helper) is used instead of reading `.message` directly, and the stack trace shown via `showDetails` guards with `error instanceof Error` first.
- **`ErrorFallback` takes `showDetails` as a prop instead of checking "are we in development" itself.** This package is consumed as raw source by both `web` (Next.js/webpack, where `process.env.NODE_ENV` is a valid global) and `admin` (Vite, whose `tsconfig.app.json` scopes `types` to `["vite/client"]` only — `@types/node` globals like `process` don't typecheck there even if installed, and Vite's own equivalent is `import.meta.env.DEV`, which doesn't exist under Next/webpack). Rather than forking the check or dragging in `@types/node` for a browser-only package, each app passes its own answer in: `apps/web/src/app/error.tsx`/`global-error.tsx` pass `process.env.NODE_ENV === "development"`, `apps/admin/src/routes/__root.tsx` passes `import.meta.env.DEV`.
- **Sentry reporting lives outside this package, not inside it.** `AppErrorBoundary`'s `onError` still just `console.error`s before calling the caller's own `onError` — deliberately left generic, since nothing currently renders `<AppErrorBoundary>` directly (both apps' actual boundaries are their framework's own: Next's `error.tsx`/`global-error.tsx`, TanStack Router's `errorComponent`). Each of those calls `Sentry.captureException(error)` itself (`apps/web/src/app/error.tsx`/`global-error.tsx`, `apps/admin/src/components/RouteError.tsx`) rather than this package depending on a specific Sentry SDK (`@sentry/nextjs` vs `@sentry/react` vs `@sentry/node` differ per app/runtime — this package has no way to pick the right one). If `<AppErrorBoundary>` does get used directly somewhere later, pass `onError={(error) => Sentry.captureException(error)}` at the call site.
- **Depends on `@outfiqe/design-system`** for `Button`, rather than raw `<button>` elements, so the fallback UI doesn't look like a foreign component bolted onto the rest of the app.
