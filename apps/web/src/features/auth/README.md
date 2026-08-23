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
- `api/oauthApi.ts` + `api/oauthSchemas.ts` — the OAuth account-management client: URL builders for
  the full-page-navigation `start`/`link/start` redirects (`buildOAuthStartUrl`/
  `buildOAuthLinkStartUrl` — never `fetch` calls, since those endpoints are browser navigations),
  plus real API calls for `confirmLink`, `unlink`, and `getLinkedAccounts`.
- `api/profileApi.ts` — `PATCH /users/me` (currently only used to add a phone number from the
  Security page's nudge; not a general profile-editing surface).
- `components/` — the form/screen components: `LoginForm`, `RegisterForm`, `BrandRegisterForm`,
  `ForgotPasswordForm`, `ResetPasswordForm`, `VerifyEmailScreen`, plus their success/loading/
  expired sub-states; `ConnectedAccounts/` (connect/disconnect Google/Facebook, Account Settings →
  Security) and `AddPhoneNumberBanner` (the OAuth-only-account phone nudge, same page).
- `context/AuthContext.tsx` + `context/authReducer.ts` — the client-side auth state (current user,
  auth status) and its reducer, exposed via `useAuth()`.
- `context/authTestWrapper.tsx` — test-only support for hooks that read/write `AuthContext`:
  `createAuthQueryClientWrapper()` (a `renderHook`/`render` wrapper combining `AuthProvider` with
  the shared `createTestQueryClient()` from `apps/web/src/testing/integration/queryClientWrapper.tsx`),
  plus `testUserSession`/`dispatchAuthSuccess` for tests that need to seed an already-authenticated
  state without going through a real login round trip (e.g. `useLogout`, `useCurrentUser`).
  Colocated here rather than in the app-wide `src/testing/` infra since it's specific to this
  feature's own context, not something other features need.
- `hooks/` — one hook per auth action (`useLogin`, `useRegister`, `useBrandRegister`, `useLogout`,
  `useForgotPassword`, `useResetPassword`, `useResendVerification`, `useCurrentUser`), plus
  `useLinkedAccounts`, `useUnlinkAccount`, and `useAddPhoneNumber` for the Security page. Each wraps
  the matching API call in a React Query mutation/query. Every hook has a colocated
  `*.integration.test.tsx` (MSW-mocked requests, matching the pattern in
  `apps/web/src/testing/README.md`); `hooks/**` is in `vitest.config.ts`'s `coverage.include`.
  There's no `useLinkAccount`/`useConnectAccount` hook — connecting a provider is a full-page
  navigation (`buildOAuthLinkStartUrl`), not a mutation.
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
- `UserSession.phone`/`hasPassword` are optional on the shared type (unlike the API-response
  `customerUserSchema`, where they're required) because `brandUserSchema` doesn't carry them — a
  brand owner's session is mapped through the same `toUserSession`, which defaults `hasPassword` to
  `true` for that branch (registering as a brand always requires a password) and `phone` to `null`.
  Components reading these fields (`ConnectedAccounts`, the Security page) only ever render for
  roles that actually reach `/dashboard/settings/security`.
- A component test that hits the network through `mswServer` must be named `*.integration.test.tsx`,
  not `*.test.tsx` — `vitest.config.ts` only loads the MSW setup file for the `integration` project;
  a network-mocked test under the plain `unit` project's name pattern silently gets no server
  running and every request fails. `ConnectedAccounts`/`AddPhoneNumberBanner`'s tests hit this
  directly (`CaptchaChallenge.test.tsx`, by contrast, is correctly a plain `.test.tsx` — it mocks
  `next/script` directly and never touches the network).

## Follow-ups

- All of `hooks/` is now tested and gated at 80% coverage. Still not covered: the invite-gated
  read flows (`getBrandInvite`/`getAdminInvite`/`validateToken` in `authApi.ts` — these back
  `BrandRegisterForm`'s invite-validation step, not a hook of their own) and every form/screen
  component under `components/` other than `CaptchaChallenge`, `ConnectedAccounts`, and
  `AddPhoneNumberBanner` — mirrors the same scope decision made in
  `apps/api/src/modules/auth/README.md` (brand/admin invite registration deferred to a later pass).
