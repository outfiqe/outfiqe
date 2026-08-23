# Auth & OAuth Workflows

Every user-facing flow implemented across the `feat/auth-security-hardening` branch, covering both the email/password auth system and Google/Facebook OAuth. For the security controls layered onto these flows, see [`docs/security/SECURITY.md`](./security/SECURITY.md).

## Contents

1. [Registration](#1-registration)
2. [Email verification](#2-email-verification)
3. [Login](#3-login)
4. [Session bootstrap (page load / SSR)](#4-session-bootstrap-page-load--ssr)
5. [Token refresh](#5-token-refresh)
6. [Logout](#6-logout)
7. [Forgot / reset password](#7-forgot--reset-password)
8. [Brand registration (invite-gated)](#8-brand-registration-invite-gated)
9. [Admin registration (invite-gated)](#9-admin-registration-invite-gated)
10. [OAuth sign-in (Google / Facebook)](#10-oauth-sign-in-google--facebook)
11. [OAuth sign-in with an existing account (link confirmation)](#11-oauth-sign-in-with-an-existing-account-link-confirmation)
12. [Connecting a provider from Account Settings](#12-connecting-a-provider-from-account-settings)
13. [Disconnecting a provider](#13-disconnecting-a-provider)
14. [Adding a phone number (OAuth-only accounts)](#14-adding-a-phone-number-oauth-only-accounts)
15. [Facebook Deauthorize / Data Deletion webhooks](#15-facebook-deauthorize--data-deletion-webhooks)

---

## 1. Registration

**User-facing:** visitor fills in name, email, phone, and password on `/register`, solves a Turnstile challenge, and submits. They land on a "check your email" screen.

**Technical:** `RegisterForm` → `useRegister` → `POST /auth/register` → `authService.register`. Checks email/phone uniqueness (`409 USER_EXISTS`/`PHONE_EXISTS`), verifies the Turnstile token, rejects a breached password, hashes with argon2id, creates the user (`emailVerified: false`), sends a verification email (or logs it to the console in dev when no mail credentials are configured), and publishes a `USER_CREATED` domain event.

## 2. Email verification

**User-facing:** clicking the emailed link lands on `/verify-email`, which verifies automatically and offers a "sign in" link.

**Technical:** `VerifyEmailScreen` → `POST /auth/verify-email` with the token → `authService.verifyEmail`. The token is a signed, short-TTL JWT (`purpose: email-verification`) with a `jti`; verification checks the `UsedPurposeToken` table for that `jti` (single-use), marks the user `emailVerified: true`, and inserts the used-token row in the same transaction.

## 3. Login

**User-facing:** email + password on `/login`. Repeated failures on the same account trigger a Turnstile challenge, then eventually a temporary lockout — both surfaced as the same generic "incorrect email or password" message, never a distinguishable state.

**Technical:** `LoginForm` → `useLogin` → `POST /auth/login` → `authService.login`. Checks lockout state before verifying the password; verifies against argon2id or (transparently upgrading) a legacy scrypt hash; issues an access token + rotating refresh token (`issueTokens`), setting the `refresh_token`/`has_session`/`csrf_token` cookies. On success, `AuthContext` is updated and the visitor is redirected to a safe `?redirect=` target or their role's default route (`/dashboard`, or the admin app for admins).

## 4. Session bootstrap (page load / SSR)

**User-facing:** reloading the page or opening a new tab restores the signed-in state without a visible flash of "logged out."

**Technical:** client-side, `AuthContext`'s mount effect checks for the non-httpOnly `has_session` cookie; if present, it calls `POST /auth/session` (non-rotating) to mint a fresh access token from the httpOnly `refresh_token` cookie, then `GET /auth/me`. Server-side, `apps/web/src/features/auth/api/serverAuth.ts`'s `getServerSessionWithToken` does the same round-trip for server components (e.g. `requireDashboardSession`), reading the refresh cookie directly from the request.

## 5. Token refresh

**Technical only** (invisible to the user): `packages/client`'s API client intercepts a `401`, calls `POST /auth/refresh` (rotating; requires the CSRF header) to get a new access token, retries the original request once, and only signs the user out if the refresh itself fails. A replayed, already-rotated-out refresh token revokes the entire token family instead of just failing — every device on that session is forced to sign in again.

## 6. Logout

**User-facing:** "Sign out" in the account menu or dashboard sidebar.

**Technical:** `useLogout` → `POST /auth/logout` (CSRF-protected) → revokes the refresh token, clears all three auth cookies, and redirects to `/login`. Succeeds silently (no-op) if there's no session to sign out of.

## 7. Forgot / reset password

**User-facing:** "Forgot password?" on `/login` → enter an email on `/forgot-password` → (if registered) an email with a reset link arrives → `/reset-password?token=...` lets them set a new password → redirected to `/login?reset=1`.

**Technical:** `forgotPassword` always returns the same success response regardless of whether the email exists. `resetPassword` validates the single-use purpose token (same `jti`/`UsedPurposeToken` mechanism as verification), rejects a breached new password, updates the hash, and — critically — **revokes every existing refresh token for that user**, signing out every other session as a security response to a password reset.

## 8. Brand registration (invite-gated)

**User-facing:** a brand owner never self-registers; they redeem a time-limited invite link (issued elsewhere, via brand-application approval) at `/register/brand?token=...`.

**Technical:** `BrandRegisterForm` validates the invite token (`getBrandInvite`), then `POST /auth/register/brand` creates the account, links it to the brand, and issues a session through the same `issueTokens` path as password login.

## 9. Admin registration (invite-gated)

Same shape as brand registration, but for the `ADMIN` role, gated by a separately-issued admin invite token. Out of scope for OAuth — admins never sign in via Google/Facebook.

## 10. OAuth sign-in (Google / Facebook)

**User-facing:** "Continue with Google" / "Continue with Facebook" on `/login` or `/register` is a **full-page navigation**, not a form submission. The visitor sees the provider's real consent screen, approves, and lands back in the app — either already signed in (the common case), or on a short intermediate screen if something needs their input (§11).

**Technical:**

1. Browser navigates to `GET /api/auth/oauth/:provider/start?redirect=<safe-path>`.
2. `oauthService.startOAuthFlow` generates a PKCE verifier/challenge and an opaque `state`, stores `{intent: SIGN_IN, provider, codeVerifier, redirectAfter}` in Redis (~10 min TTL), and redirects to the provider's real authorization endpoint.
3. The provider redirects back to `GET /api/auth/oauth/:provider/callback?code=...&state=...`.
4. The state is consumed (get-then-delete) and validated; the authorization code is exchanged with the provider (`providers/google.provider.ts` / `providers/facebook.provider.ts`), verifying the identity token/access token server-side.
5. `resolveSignInIdentity` branches three ways:
   - **Existing linked identity** → sign in via `issueTokens`, same as password login.
   - **Email matches an existing account with no prior link** → §11 (link confirmation required, no auto sign-in).
   - **No match at all** → auto-create a new `CUSTOMER`-role account (`passwordHash: null`, no phone) plus its `OAuthIdentity`, publish `USER_CREATED`, then sign in.
6. On success, the API sets the session cookies and redirects the browser directly to `redirectAfter` — no tokens ever appear in a URL or query string.

## 11. OAuth sign-in with an existing account (link confirmation)

**User-facing:** if the provider's email already belongs to an Outfiqe account that hasn't connected that provider before, the visitor lands on `/auth/oauth-callback` with a message asking them to enter that account's password to confirm the connection. Submitting signs them in and links the provider for next time.

**Technical:** the callback stores `{userId, provider, providerUserId, emailAtLinkTime}` in Redis under an opaque `linkToken` and redirects to `/auth/oauth-callback?linkToken=...&email=...&provider=...` (no session issued). `OAuthCallbackScreen` renders a password form; submitting calls `POST /auth/oauth/:provider/link/confirm`, which verifies the password (reusing the login lockout counter), attaches the `OAuthIdentity` to that account, and signs them in through the normal `issueTokens` path. The frontend then fetches `/auth/me` and routes to the account's actual default route (customer dashboard or brand dashboard — this path isn't customer-only).

## 12. Connecting a provider from Account Settings

**User-facing:** an already-signed-in user visits Dashboard → Settings → Security, sees which providers are connected, and clicks "Connect" on one that isn't.

**Technical:** navigates to `GET /api/auth/oauth/:provider/link/start` (`requireAuth`), which stores `{intent: LINK, provider, codeVerifier, linkForUserId}` instead of a sign-in state. The shared callback route detects `intent: LINK`, attaches the identity to `linkForUserId` (reviving a previously-disconnected identity if it's the same account's, rejecting with `409` if it belongs to someone else), and redirects back into Settings — no new session is issued, since the caller already has one.

## 13. Disconnecting a provider

**User-facing:** "Disconnect" next to a connected provider in Settings → Security opens a confirmation. If the account has a password, it asks for it first; if the account is fully OAuth-based (no password), it just asks to confirm. If disconnecting would leave the account with no way to sign back in, it's blocked with an explanation instead.

**Technical:** `DELETE /auth/oauth/:provider/link` (`requireAuth`) → `unlinkIdentity` re-verifies the password when one exists, then blocks with `409 ONLY_AUTH_METHOD` if the account would end up with zero active auth methods; otherwise soft-revokes the `OAuthIdentity`.

## 14. Adding a phone number (OAuth-only accounts)

**User-facing:** an account created via OAuth never collected a phone number at signup. Settings → Security shows a nudge banner; expanding it and entering a valid Nepali phone number saves it immediately.

**Technical:** `AddPhoneNumberBanner` → `useAddPhoneNumber` → `PATCH /users/me` with `{phone}`. Checks phone uniqueness (`findByPhone`, excluding the caller's own row) before writing, returning the same `409 PHONE_EXISTS` shape registration uses on conflict. This endpoint only ever _sets_ a phone — there's no "remove my phone number" affordance.

## 15. Facebook Deauthorize / Data Deletion webhooks

**No user-facing UI** — these are server-to-server calls Meta makes when a user removes the app's permissions or requests data deletion through Facebook itself.

**Technical:** `POST /api/webhooks/facebook/deauthorize` and `POST /api/webhooks/facebook/data-deletion` verify Meta's `signed_request` payload, then revoke the matching `OAuthIdentity` (identity-only — the Outfiqe account and its other data are untouched). The data-deletion endpoint additionally returns Meta's required `{url, confirmation_code}` response shape.
