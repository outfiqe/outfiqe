# Outfiqe Admin

Internal admin panel: review brand applications and products, approve creators, manage admin
team access. React + Vite, talks to `@outfiqe/api` — gated to the `ADMIN` role.

**There's no login form in this app.** Signing in happens on `apps/web`'s `/login` (same
cookie-based session, shared cross-origin) — visiting this app while signed out redirects there,
and a successful `ADMIN`-role login sends you straight back. See `getDefaultRoute.ts` /
`safeRedirect.ts` in `apps/web` for the redirect wiring.

## Getting started

```
pnpm --filter @outfiqe/admin dev
```

Copy `.env.example` to `.env` — `VITE_WEB_URL` (where to send signed-out visitors) is required.
`VITE_API_URL` is optional: `apiClient` defaults to the same-origin `/api` (proxied to the API by
`vite.config.ts`'s dev server, matching the browser-facing setup in every other environment) and
only needs overriding to point at a genuinely different, cross-origin API host.

The first admin in an environment is created via the API's boot-time bootstrap
(`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`/`ADMIN_BOOTSTRAP_PHONE`, see
`apps/api/.env.example`). From there, sign in on `apps/web` and use **Team** to invite further
admins (they set up their own password on `/register?token=...` here).

## Deployment

The Vite build sets `base: "/admin/"`, so every emitted URL (entry script, `assets/*`, favicon)
is prefixed `/admin/`. This keeps the app self-consistent whether it's hit directly or proxied
through `apps/web` at `outfiqe.com/admin` (Next rewrites `/admin/:path*` straight to this host).

Static hosts serve the build output at their root, not under `/admin/`, so `vercel.json` maps the
prefixed paths back onto the real files: `/admin/assets/*` -> `/assets/*`, `/admin/favicon.svg`
-> `/favicon.svg`, and every other `/admin/*` (plus `/`) -> `/index.html` for client-side
routing. Without it, `admin.<domain>/admin/` and the `outfiqe.com/admin` proxy both 404.

`vercel.json` also proxies `/api/*` to the API host so the browser always talks to a same-origin
`/api` -- identical to how `apps/web` reaches the API. `apiClient` must therefore use the
same-origin default: **leave `VITE_API_URL` unset in production** (or set it to `/api`). Setting it
to the bare API origin (`https://api.<domain>`) drops the `/api` path segment the routes are
mounted under, so every call 404s and the auth gate falls into a redirect loop with the web
login.

### Which branches Vercel deploys

Vercel is meant to build **only `main`** -- there is no staging site and feature-branch previews
are not used here. Two settings in `vercel.json` enforce that, and `apps/web/vercel.json` carries
the same pair:

- `git.deploymentEnabled.dev = false` -- a push to the long-lived `dev` branch creates no Vercel
  deployment at all, not even a skipped one.
- `ignoreCommand` -- `test "$VERCEL_GIT_COMMIT_REF" != "main"` exits `0` (Vercel reads that as
  "skip the build") for every ref that is not `main`, and exits non-zero on `main` so the build
  runs. This is the catch-all that also covers feature branches, which can't be enumerated in
  `deploymentEnabled`.

The Vercel project's **Production Branch** should still be `main` in the dashboard so the
deployment that does run on `main` is treated as production. If the release branch ever changes,
update the `main` literal in both `vercel.json` files.
