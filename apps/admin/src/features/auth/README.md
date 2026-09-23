# auth

## Purpose

Session handling for `apps/admin`. The admin app has **no login screen of its own** — signing in
happens on `apps/web` (`/login`, including Google OAuth), and the admin app only restores,
exposes, and clears the resulting session.

## Structure

- `AuthContext.tsx` — `AuthProvider` restores the session on mount. If the URL carries an
  `impersonation_code` query param (the platform Impersonation screen's "Open" hand-off, see
  `platform-impersonation`'s README), it redeems that instead of the normal
  `authApi.refresh()` → `authApi.me()` path, then strips the param from the address bar with
  `window.history.replaceState`. It holds the `AuthState` (`loading` | `signed-out` |
  `signed-in`), and exposes `logout`, `updateUser`, `setSession` through `useAuth()`. The
  `signed-out` state carries a `reason` (`"session-ended"` | `"user-signed-out"` |
  `"impersonation-code-invalid"`) — see rationale below.
- `api.ts` — `authApi`: refresh, me, logout, profile/password updates, the admin- and
  CRM-invite registration calls, and `redeemImpersonationCode`.
- `schemas.ts` — Zod schemas / types for the admin user, invites, and profile/password inputs.
- `RegisterInvitePage.tsx` — the one auth screen the admin app does own: completing an
  admin/CRM invite (`/register?token=…`).

## Funnel

**User-facing:** an admin opens any `/_authenticated/*` page → `ProtectedRoute` shows "Loading…"
while the session restores → if a valid ADMIN/BRAND_OWNER session comes back they see the page;
otherwise they are sent to `apps/web`'s `/login`. After signing in on the web app they are
returned to the admin app. Choosing "Sign out" from the account menu ends the session and sends
them to the web `/login` with a clean slate.

**Technical:** `AuthProvider` (mounted in the app root) → `authApi.refresh()` sets the access
token on `@/lib/apiClient`, `authApi.me()` loads the user → `useAuth()` state →
`components/ProtectedRoute.tsx` reads it and, when `signed-out`, sets `window.location.href` to
`<web-origin>/login`. `@/lib/apiClient`'s 401 handler also flips the context to `signed-out`.

## Non-obvious rationale

- **Why `signed-out` has a `reason`:** `ProtectedRoute` sends a signed-out admin to the web
  `/login`. When the session ended on its own (401, failed refresh, non-admin role) it appends
  `?redirect=<current admin path>` so the admin lands back where they were after re-auth. That
  `redirect` value is carried through the web login form and **survives the Google OAuth
  round-trip**, so if it were always attached, an admin who deliberately signed out and then
  signed back in would be dropped straight back onto the exact page they left — not what "sign
  out" implies. `logout()` therefore sets `reason: "user-signed-out"`, and `ProtectedRoute` omits
  the `redirect` for that case, letting the web app pick its default post-login destination
  (the admin app root, which routes on to `/platform` or `/crm`).
- **`"impersonation-code-invalid"` skips the web-login redirect entirely.** A stale or reused
  hand-off code isn't "no session" — sending that tab to the web login and back would sign the
  platform admin into their own account on the tenant's subdomain, not into the impersonation
  they were trying to open. `ProtectedRoute` shows `ImpersonationLinkExpired` in place instead of
  redirecting, and points back at the Impersonation screen for a fresh link.

## Form validation

The admin and CRM invite registration pages use react-hook-form with `registerForm.schema.ts`: a Nepali mobile number (`NEPAL_PHONE_REGEX` from `@outfiqe/utils`), a password of 8 to 128 characters, and a matching confirmation; the CRM page also asks for a full name. Messages show under each field. Both pages go straight to the app on success, so there is no toast.
