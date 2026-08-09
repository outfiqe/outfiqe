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

Copy `.env.example` to `.env` — `VITE_API_URL` (the API) and `VITE_WEB_URL` (where to send
signed-out visitors).

The first admin in an environment is created via the API's boot-time bootstrap
(`ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`/`ADMIN_BOOTSTRAP_PHONE`, see
`apps/api/.env.example`). From there, sign in on `apps/web` and use **Team** to invite further
admins (they set up their own password on `/register?token=...` here).
