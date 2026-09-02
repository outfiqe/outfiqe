# Auth (web)

## Purpose

Everything needed to authenticate a user on the public site: login, registration (including brand
registration via an invite token), password reset/forgot-password, email verification, and the
client-side session/user context the rest of the app reads.

## Structure

- `api/authApi.ts` — the typed client for all auth endpoints (login, register, logout, password
  reset, signed-in password change, email verification, current-user).
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
  expired sub-states; `ChangePasswordCard/` (the signed-in "change your password" form on Account
  Settings → Security — for a connected-account-only user with no password it instead links to the
  forgot-password flow to set one); `ConnectedAccounts/` (connect/disconnect Google/Facebook,
  Account Settings → Security) and `AddPhoneNumberBanner` (the OAuth-only-account phone nudge, same
  page);
  `ContinueWithOAuthButtons` (the "Google"/"Facebook" row on `LoginForm`/`RegisterForm`) and
  `OAuthCallbackScreen/` (renders at `/auth/oauth-callback`, the page the API redirects a failed or
  link-required OAuth attempt to — a successful sign-in never lands here, it's redirected straight
  to its destination with the session cookie already set).
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
  `useForgotPassword`, `useResetPassword`, `useChangePassword`, `useResendVerification`,
  `useCurrentUser`), plus `useLinkedAccounts`, `useUnlinkAccount`, and `useAddPhoneNumber` for the
  Security page. Each wraps
  the matching API call in a React Query mutation/query. Every hook has a colocated
  `*.integration.test.tsx` (MSW-mocked requests, matching the pattern in
  `apps/web/src/testing/README.md`); `hooks/**` is in `vitest.config.ts`'s `coverage.include`.
  There's no `useLinkAccount`/`useConnectAccount` hook — connecting a provider is a full-page
  navigation (`buildOAuthLinkStartUrl`), not a mutation. `useConfirmOAuthLink` (used by
  `OAuthCallbackScreen`) is the one exception to "one hook wraps one API call" — after
  `oauthApi.confirmLink` returns an access token, it also fetches `/auth/me` and dispatches
  `AUTH_SUCCESS` itself, the same session-bootstrap sequence `AuthContext`'s own mount effect runs,
  because a full-page-redirect flow has no equivalent to `useLogin`'s response body carrying the
  user inline.
- `schemas/` — Zod validation schemas for each auth form.
- `types/index.ts` — shared auth types (`UserSession`, `UserRole`, `CreatorStatus`, etc.).
- `utils/authErrors.ts` — maps API auth error codes to user-facing messages.
- `utils/getDefaultRoute.ts` — picks the post-login landing route by role.
- `utils/safeRedirect.ts` (+ colocated `safeRedirect.test.ts`) — `getSafeRedirect` validates a
  `?redirect=` query value before using it, so a login/register flow can't be used as an
  open-redirect vector; `isAdminAppTarget` reports whether a (already-safe) path points into the CRM
  app (`/admin` or `/admin/...`), which `useLogin` and `proxy.ts` use to decide a cross-app
  navigation.
- `index.ts` — the feature's public exports.

## Funnel

**User-facing:** a visitor logs in, registers, or (via a brand invite link) registers as a brand;
a returning visitor can request a password reset or resend a verification email. A signed-in
visitor can change their password from Account Settings → Security (`ChangePasswordCard`) — this
signs their other devices out but keeps the current one. On success, the app redirects them either
to a safe `?redirect=` target or their role's default route. Login and
register both also offer "Continue with Google/Facebook" — a full-page navigation, not a form
submission — which either signs the visitor straight in, or (if that provider's email already
belongs to an existing password account) lands them on `/auth/oauth-callback` to confirm the link
with that account's password before signing in.

**Technical:** a form component → its dedicated hook (e.g. `useLogin`) → `authApi` → the API
client → `apps/api`'s auth module. On success, `AuthContext`/`authReducer` is updated so the rest
of the app (nav, protected routes, `useAuth()`) reflects the new session immediately. The OAuth
buttons instead navigate the whole page to `buildOAuthStartUrl(provider, redirectAfter)` —
`apps/api/src/modules/auth/oauth` owns the entire round-trip with the provider and, on success,
redirects the browser straight to `redirectAfter` with the refresh-token cookie already set; this
feature only picks back up if that redirect instead lands on `/auth/oauth-callback`
(`OAuthCallbackScreen`), reading `linkToken`/`email`/`provider` (link confirmation needed) or
`error` (something failed) from the query string the API put there.

## Non-obvious rationale

- `safeRedirect` exists because `?redirect=` is attacker-controlled input: it only allows a
  same-app, single-leading-slash path (rejecting protocol-relative URLs like `//evil.com` and
  backslash tricks like `/\evil.com`) and refuses to redirect back into an auth screen, which would
  otherwise create a login/redirect loop.
- A `?redirect=` that points into the CRM app (`isAdminAppTarget`) is only honoured when the login
  page is itself on a tenant subdomain (`useTenantHost` in `useLogin`, `isTenantHost` against
  `NEXT_PUBLIC_TENANT_BASE_DOMAIN` in `proxy.ts`). The CRM's own `ProtectedRoute` bounces a
  signed-out user to `<tenant-origin>/login?redirect=/admin/...`, and this rule is what keeps that
  storefront ⇄ CRM round trip scoped to a real tenant: on the apex domain the redirect is dropped
  and the user lands on their role's default route instead. A platform admin signing in on the apex
  therefore always goes to `/admin` (its default) rather than being deep-linked back — an accepted
  trade for keeping the "only in a tenant" rule simple. OAuth's `redirectAfter` is not gated here;
  the dominant path is the `ProtectedRoute` → `/login` → `useLogin` bounce.
- `UserSession.phone`/`hasPassword` are optional on the shared type (unlike the API-response
  `customerUserSchema`, where they're required) because `brandUserSchema` doesn't carry them — a
  brand owner's session is mapped through the same `toUserSession`, which defaults `hasPassword` to
  `true` for that branch (registering as a brand always requires a password) and `phone` to `null`.
  Components reading these fields (`ConnectedAccounts`, the Security page) only ever render for
  roles that actually reach `/settings/security`.
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
  component under `components/` other than `CaptchaChallenge`, `ConnectedAccounts`,
  `AddPhoneNumberBanner`, `ContinueWithOAuthButtons`, and `OAuthCallbackScreen` — mirrors the same
  scope decision made in `apps/api/src/modules/auth/README.md` (brand/admin invite registration
  deferred to a later pass). In particular, `LoginForm`/`RegisterForm` themselves (now including
  the OAuth buttons row) are still untested.
