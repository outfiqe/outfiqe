# healthz

## Purpose

`GET /healthz`: the web app's liveness check for uptime monitors. It answers `{ "status": "ok" }`
without rendering a page or calling the API.

## Structure

- `route.ts`: the handler. `dynamic = "force-dynamic"` and `Cache-Control: no-store`, so every
  check reaches a running function instead of a cached answer.

## Funnel

Technical: the monitor sends `GET https://outfiqe.com/healthz` → the proxy matcher skips
`healthz`, so no CSP work runs → `route.ts` returns 200.

## Non-obvious rationale

- **Monitors point here (or at the API's `/ready`), never at a page.** An uptime check that loaded
  `/` once a minute (Sentry's uptime bot, on a tenant subdomain) used up the Vercel plan's whole
  monthly Active CPU allowance, because each check was a full homepage render. This handler costs
  a few milliseconds. To check the backend, database and Redis, monitor
  `https://api.outfiqe.com/ready` on the droplet instead; it costs nothing on Vercel.
- **Not under `/api/*`.** `next.config.ts` rewrites `/api/:path*` to the Express backend, so a
  handler there would never run.
