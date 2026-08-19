# Auth (web)

## Purpose

Everything needed to authenticate a user on the public site: login, registration (including brand
registration via an invite token), password reset/forgot-password, email verification, and the
client-side session/user context the rest of the app reads.

## Structure

- `api/authApi.ts` — the typed client for all auth endpoints (login, register, logout, password
  reset, email verification, current-user).
- `api/serverAuth.ts` — server-only session/token helpers used by server components and route
  handlers (e.g. `apps/web/src/features/brand-profile`'s SSR fetch).
- `api/userSchemas.ts` — Zod schemas for the session/user shape returned by the API.
- `components/` — the form/screen components: `LoginForm`, `RegisterForm`, `BrandRegisterForm`,
  `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailScreen`, plus their success/loading/
  expired sub-states.
- `context/AuthContext.tsx` + `context/authReducer.ts` — the client-side auth state (current user,
  auth status) and its reducer, exposed via `useAuth()`.
- `hooks/` — one hook per auth action (`useLogin`, `useRegister`, `useBrandRegister`, `useLogout`,
  `useForgotPassword`, `useResetPassword`, `useResendVerification`, `useCurrentUser`), each wrapping
  the matching `authApi` call in a React Query mutation/query. `useLogin`/`useForgotPassword`/
  `useRegister`/`useResendVerification`/`useResetPassword`/`useLogout` have colocated
  `*.integration.test.tsx` files (MSW-mocked `authApi` requests, matching the pattern in
  `apps/web/src/testing/README.md`).
- `schemas/` — Zod validation schemas for each auth form.
- `types/index.ts` — shared auth types (`UserSession`, `UserRole`, `CreatorStatus`, etc.).
- `utils/authErrors.ts` — maps API auth error codes to user-facing messages.
- `utils/getDefaultRoute.ts` — picks the post-login landing route by role.
- `utils/safeRedirect.ts` (+ colocated `safeRedirect.test.ts`) — validates a `?redirect=` query
  value before using it, so a login/register flow can't be used as an open-redirect vector.
- `index.ts` — the feature's public exports.

## Funnel

**User-facing:** a visitor logs in, registers, or (via a brand invite link) registers as a brand;
a returning visitor can request a password reset or resend a verification email. On success, the
app redirects them either to a safe `?redirect=` target or their role's default route.

**Technical:** a form component → its dedicated hook (e.g. `useLogin`) → `authApi` → the API
client → `apps/api`'s auth module. On success, `AuthContext`/`authReducer` is updated so the rest
of the app (nav, protected routes, `useAuth()`) reflects the new session immediately.

## Non-obvious rationale

- `safeRedirect` exists because `?redirect=` is attacker-controlled input: it only allows a
  same-app, single-leading-slash path (rejecting protocol-relative URLs like `//evil.com` and
  backslash tricks like `/\evil.com`) and refuses to redirect back into an auth screen, which would
  otherwise create a login/redirect loop.

## Follow-ups

- Hook test coverage currently stops at the plain-session mutations. Not yet covered:
  `useBrandRegister`/`useCurrentUser`, the invite-gated flows (`getBrandInvite`/`getAdminInvite`/
  `validateToken` in `authApi.ts`), and every form/screen component under `components/` — mirrors
  the same scope decision made in `apps/api/src/modules/auth/README.md` (brand/admin invite
  registration deferred to a later pass). `vitest.config.ts`'s `coverage.include` isn't updated for
  this feature yet for the same reason as the API side: partial coverage would fail the 80% gate.
