# Authentication & OAuth Security

This document describes every security measure implemented across the `feat/auth-security-hardening` branch, why it exists, and where it lives in the codebase. It's aligned with the **OWASP Application Security Verification Standard (ASVS)** and **OWASP Top 10**, and each section is cited against the relevant standard where applicable.

For the user-facing and technical flows these measures protect, see [`docs/WORKFLOWS.md`](../WORKFLOWS.md).

## Contents

1. [Password storage](#1-password-storage)
2. [Password policy & breach checking](#2-password-policy--breach-checking)
3. [Account enumeration resistance](#3-account-enumeration-resistance)
4. [Refresh token rotation & reuse detection](#4-refresh-token-rotation--reuse-detection)
5. [Single-use verification & reset tokens](#5-single-use-verification--reset-tokens)
6. [Rate limiting](#6-rate-limiting)
7. [Account lockout](#7-account-lockout)
8. [Bot/abuse challenge (CAPTCHA)](#8-botabuse-challenge-captcha)
9. [CSRF protection](#9-csrf-protection)
10. [Cookie flags](#10-cookie-flags)
11. [Audit logging](#11-audit-logging)
12. [Transport & security headers](#12-transport--security-headers)
13. [OAuth 2.0 / PKCE](#13-oauth-20--pkce)
14. [OAuth account linking & takeover prevention](#14-oauth-account-linking--takeover-prevention)
15. [OAuth account disconnection](#15-oauth-account-disconnection)
16. [Facebook webhook signature verification](#16-facebook-webhook-signature-verification)
17. [Error handling & information disclosure](#17-error-handling--information-disclosure)

---

## 1. Password storage

_OWASP Password Storage Cheat Sheet; ASVS V6.2_

New passwords are hashed with **argon2id** (`@node-rs/argon2`, native bindings, adaptive cost), never a fast general-purpose hash or reversible encryption.

- `apps/api/src/shared/utils/password.utils.ts` — `hashPassword`/`verifyPassword`/`needsRehash`.
- The codebase's original hashing scheme was scrypt (`scrypt:saltHex:hashHex`). `verifyPassword` still verifies that format for existing users, and a successful login against a legacy hash **transparently re-hashes it to argon2id in the background** — no forced password reset, no blocking the login on the rehash.
- Timing-safe comparison (`crypto.timingSafeEqual`) is used for the legacy scrypt path.

## 2. Password policy & breach checking

_ASVS V2.1_

- Minimum length is enforced over composition rules (no forced special-character/uppercase rules — length is the stronger signal).
- `register` and `resetPassword` additionally reject any password found in the **HaveIBeenPwned breach corpus**, checked via the **k-anonymity range API** — only the first 5 characters of the password's SHA-1 hash ever leave the server; the plaintext password is never sent off-box.
  - `apps/api/src/shared/utils/password-breach.utils.ts` — `isPasswordBreached`.
  - **Fails open**: a network/API error to HIBP is logged and treated as "not breached," so a third-party outage never blocks someone from registering or resetting their password. This is a deliberate asymmetry with CAPTCHA (see §8), which fails _closed_ — a broken password check has a low-severity failure mode, a broken bot check does not.
  - `PASSWORD_BREACH_CHECK_ENABLED` env flag; disabled in the test sandbox to avoid live network calls in CI.

## 3. Account enumeration resistance

_ASVS V2.2.3; OWASP Top 10 A07:2021_

No response — content, timing-shape, or status code — ever lets a caller distinguish "this account exists" from "it doesn't," across every auth entry point:

- **Login**: always the same generic `INVALID_CREDENTIALS` 401, whether the email doesn't exist, the password is wrong, the account is locked out, or the account is OAuth-only with no password to check against.
- **Register**: kept as the existing, deliberately-different `409 USER_EXISTS`/`PHONE_EXISTS` behavior (a confirmed product decision — registration conflicts are not treated as an enumeration risk in this app).
- **forgot-password / resend-verification**: always return the same `200` success response regardless of whether the email is registered or already verified; unknown/verified addresses no-op silently server-side.
- **verify-email / reset-password**: a token that verifies successfully but whose subject user no longer exists returns the _same generic_ `INVALID_TOKEN` shape as an expired or tampered token — not a distinguishable "user not found."

## 4. Refresh token rotation & reuse detection

_ASVS V3.3_

- Refresh tokens are opaque random values (`apps/api/src/shared/utils/opaque-token.utils.ts`), stored server-side only as a SHA-256 hash — the raw token is never persisted.
- Every `POST /auth/refresh` call **rotates** the token: the presented token is soft-revoked (`revokedAt` + `replacedByTokenHash`) and a new one is issued, sharing a `familyId` with every token descended from the same original login.
- **Reuse detection**: if an already-rotated-out token is presented again (a strong signal of a stolen/replayed token racing the legitimate client), the **entire token family is revoked** — every device on that session is signed out, not just the replayed token. Rotation revokes the old token _before_ issuing the new one, so a failure mid-rotation can never leave both tokens simultaneously valid.
- `POST /auth/session` (the non-rotating SSR path used by server components on every render) deliberately does **not** rotate — it would otherwise burn the browser's refresh token on its first server-side use — but still rejects a token already rotated out by a real `/refresh` call.
- A scheduled sweep (`apps/api/src/modules/auth/auth.retention.ts`) hard-deletes revoked/expired refresh token rows past a retention window. This is cleanup only — a token is unusable the moment it's revoked or expired, regardless of when the sweep runs.

## 5. Single-use verification & reset tokens

_OWASP Forgot Password Cheat Sheet; ASVS V2.5_

- Email-verification and password-reset links are short-TTL signed JWTs carrying a `jti` claim.
- On use, the `jti` is checked against (and, in the same transaction as the state change, inserted into) a `UsedPurposeToken` table — a second use of the same link fails with the generic `INVALID_TOKEN` response (§3).
- The DB's primary key on `jti` closes the race window on **concurrent** replay of the same token: exactly one request wins the insert, the other gets a clean `INVALID_TOKEN` instead of a raw constraint-violation error.
- Completing a password reset also invalidates every outstanding refresh token for that user (ASVS V2.5.5, V3.3 — see §4).

## 6. Rate limiting

_ASVS V2.2; OWASP Top 10 A07:2021_

Redis-backed, fail-open on Redis errors (`apps/api/src/shared/middlewares/rate-limit.ts`), applied per route with named thresholds in each module's `*.constants.ts`:

| Route                                                                        | Keying                                                                                                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/auth/login`                                                                | IP **and** per-account (email) — two independent limiters, since a distributed credential-stuffing attempt and a targeted single-account attempt look different |
| `/auth/register`                                                             | IP                                                                                                                                                              |
| `/auth/refresh`                                                              | IP                                                                                                                                                              |
| `/auth/reset-password`, `/auth/forgot-password`, `/auth/resend-verification` | IP (and per-email for forgot-password/resend-verification)                                                                                                      |
| `/auth/oauth/:provider/start`, `/link/start`                                 | IP                                                                                                                                                              |
| `/auth/oauth/:provider/link/confirm`                                         | IP — this endpoint is an unauthenticated password check, so it needs the same protection as login                                                               |

`app.ts` sets `app.set("trust proxy", 1)` — without it, every request behind the app's reverse proxy resolves to the proxy's own IP and all callers share one bucket.

## 7. Account lockout

_ASVS V2.2_

Independent of rate limiting, `apps/api/src/modules/auth/auth.lockout.utils.ts` tracks failed login attempts **per account** in Redis. Once an account crosses `LOGIN_LOCKOUT_THRESHOLD` failures within `LOGIN_LOCKOUT_WINDOW_MS`, further attempts are rejected with the **same generic** `INVALID_CREDENTIALS` response — checked _before_ password verification, and _even when the correct password is supplied_ — so lockout state itself can never become an oracle for account existence or a correct-guess signal. A successful login resets the counter. The same counter is reused by OAuth's `link/confirm` endpoint (§14), since that's also fundamentally a password check against an existing account.

## 8. Bot/abuse challenge (CAPTCHA)

_ASVS V2.2; OWASP Top 10 A07:2021_

- **Cloudflare Turnstile**, verified server-to-server (`apps/api/src/modules/auth/auth.captcha.utils.ts`).
- `POST /auth/register` always requires a passing token.
- `POST /auth/login` starts requiring one once an account's failed-login count crosses `LOGIN_CAPTCHA_CHALLENGE_THRESHOLD` (deliberately lower than the lockout threshold — a scripted attacker gets challenged before they get locked out; a person who mistypes their password once or twice never sees a challenge).
- **Fails closed**: a Turnstile outage or misconfiguration is treated as "not verified," the opposite of the breach-password check's fail-open default (§2) — a broken bot check silently becoming no bot check on a public write endpoint is the worse failure mode here.

## 9. CSRF protection

_ASVS V4.2.2; OWASP CSRF Prevention Cheat Sheet_

A double-submit cookie, scoped to the only two cookie-authenticated, state-changing routes: `POST /auth/refresh` and `POST /auth/logout`.

- `setRefreshCookie` sets a non-httpOnly `csrf_token` cookie alongside `refresh_token`.
- `requireCsrfHeader` (`apps/api/src/shared/middlewares/csrf.ts`) rejects the request with `403 CSRF_MISMATCH` unless the `X-CSRF-Token` header matches the cookie exactly.
- Gated on the `refresh_token` cookie actually being present, so `/logout`'s existing "no session, succeed silently" behavior is untouched.
- Every _other_ state-changing route in the app authenticates via a `Bearer` access token, not a cookie — a cross-site request can't forge that header, so those routes don't need this.
- `packages/client`'s shared API client reads the cookie and attaches the header automatically on every request (including the raw `axios.post` inside its own token-refresh logic, which bypasses its normal interceptors) — this one change covers `apps/web` and `apps/admin` for free.
- `SameSite=Strict` on these cookies (§10) already blocks the classic cross-site-form CSRF vector on its own; this is defense-in-depth for what it doesn't cover (same-site script injection, older browsers, proxies that don't fully honor `SameSite`).

## 10. Cookie flags

_ASVS V3.4_

Every cookie carrying a refresh token is `httpOnly` (never readable from JavaScript), `Secure` in production, and `SameSite=Strict`. A parallel non-httpOnly `has_session` flag cookie lets the client skip a doomed refresh call when definitely logged out, without exposing the token itself.

## 11. Audit logging

_ASVS V7_

Every login-adjacent outcome — register/login success and failure, lockout, captcha rejection, refresh success and reuse-detection, logout, password-reset success — logs through a shared `auditLog` helper as one structured line (`event`, `outcome`, `userId`/`email` where known, `ip`), landing in Winston's JSON file transports for querying. **Never** the password, token, or reset link itself.

## 12. Transport & security headers

_ASVS V9_

- `helmet()` in `apps/api/src/app.ts`: HSTS (1 year, `includeSubDomains`, `preload`), a restrictive `Content-Security-Policy`, and `frameguard` (`deny`) against clickjacking.
- `apps/web/next.config.ts` sets the equivalent headers at the Next.js layer, including `frame-ancestors 'self'` on auth pages and, in production, `upgrade-insecure-requests` and HSTS.
- CSP is deliberately narrow (`default-src 'self'`) with named exceptions only for what's actually needed: Cloudflare Turnstile's script/frame/connect origins, and Sentry's DSN origin for error reporting.

## 13. OAuth 2.0 / PKCE

_RFC 9700 OAuth 2.0 Security BCP; ASVS V3_

- **Authorization Code + PKCE (S256)**, mediated entirely server-side — neither Google's nor Facebook's client secret ever reaches the browser.
- State and the PKCE code verifier are stored server-side in Redis (`redisKeys.oauthState`, ~10 minute TTL), keyed by an opaque, unguessable `state` value — not a client-visible cookie or query param carrying secrets.
- State is **consumed atomically** (get + delete) on callback: a replayed `state` value fails with `OAUTH_STATE_INVALID`, and the exchange call to the provider is never even attempted for a bad state.
- **Google**: `google-auth-library`'s `OAuth2Client.verifyIdToken` verifies the returned `id_token`'s signature against Google's _live_ JWKS (never decodes-and-trusts it), plus issuer/audience/expiry.
- **Facebook**: every Graph API call carries an `appsecret_proof` (HMAC-SHA256 of the access token, keyed by the app secret) — Meta rejects any call without a matching proof, so a leaked access token alone isn't enough to impersonate the app.
- An unverified provider email is rejected outright (`OAUTH_EMAIL_UNVERIFIED`) before any account is created or session issued.
- `OAUTH_REDIRECT_BASE_URL` is the public frontend origin, not the API's own — see the rationale in `apps/api/src/modules/auth/oauth/README.md`.
- **Session issuance stays uniform**: OAuth sign-in reuses the exact same `issueTokens` function (short-lived JWT access token + DB-backed, hashed, rotating refresh token) that password login uses — no separate, weaker session type for social login.

## 14. OAuth account linking & takeover prevention

This is the single most important security property of the OAuth implementation:

> **An OAuth provider email matching an existing Outfiqe account never auto-signs that visitor in.**

If Google/Facebook reports an email that already belongs to an account with no prior link to that provider identity, the callback returns a `link_required` outcome — no session is issued. The visitor is redirected to `/auth/oauth-callback` and must **re-prove ownership of the existing account by its password** before the provider identity gets attached and a session is issued (`POST /auth/oauth/:provider/link/confirm`).

Why this matters: without this check, anyone who could get a matching email address verified at Google or Facebook (e.g. a since-abandoned or compromised inbox) could sign straight into someone else's Outfiqe account by "logging in with Google" — a classic account-takeover vector this design closes off entirely. The password-confirm endpoint reuses the same account-lockout counter as `/login` (§7), since it's fundamentally the same kind of password-guessing surface.

An already-signed-in user can also **proactively** connect a new provider from Account Settings → Security (`GET /auth/oauth/:provider/link/start`, `requireAuth`-gated) — a different, authenticated entry point into the same PKCE round-trip, distinguished internally by an `intent: LINK` flag on the stored state rather than a separate endpoint family.

Reconnecting a previously-disconnected provider identity to its **original** owner revives the existing (revoked) `OAuthIdentity` row; attempting to attach a provider identity that's currently — or was ever — linked to a **different** account is rejected with `409 OAUTH_IDENTITY_ALREADY_LINKED`, treating "previously linked, since disconnected" the same as "currently linked" for this check, since silently allowing reassignment would itself be a takeover surface.

## 15. OAuth account disconnection

`DELETE /auth/oauth/:provider/link` (`requireAuth`) re-proves the account's password before disconnecting, unless the account has no password (a fully OAuth-created account) — in which case the existing authenticated session is the only proof available, and that's accepted. Either way, the disconnect is blocked with `409 ONLY_AUTH_METHOD` if it would leave the account with **zero** remaining ways to sign back in — a password, if the account has one, always counts as a fallback method on its own.

## 16. Facebook webhook signature verification

Meta's Deauthorize and Data Deletion Request callbacks (`POST /api/webhooks/facebook/{deauthorize,data-deletion}`) are server-to-server calls with no user session — authentication is the request's own **`signed_request` HMAC-SHA256 signature**, keyed by `FACEBOOK_APP_SECRET`, verified with a constant-time comparison (`apps/api/src/modules/auth/oauth/facebook.webhooks.utils.ts`). Verification fails closed on anything even slightly malformed (wrong segment count, bad signature, wrong `algorithm` field, unparseable payload, missing `user_id`). Both callbacks are **identity-only** in scope — they revoke the matching `OAuthIdentity`, never the Outfiqe account or its other data (a confirmed product decision, not a technical limitation).

## 17. Error handling & information disclosure

No response body, `AppError`, or rendered UI text ever includes a raw stack trace, a database/Prisma error object, an internal file path, or SQL. Every route returns a short, safe, generic message on failure and logs the real error server-side only (`logger`, `describeError`).

---

## Standards mapping

| Area                      | Standard                                       |
| ------------------------- | ---------------------------------------------- |
| Password storage          | OWASP Password Storage Cheat Sheet, ASVS V6.2  |
| Password policy           | ASVS V2.1                                      |
| Login abuse protection    | ASVS V2.2, OWASP Top 10 A07:2021               |
| Refresh token rotation    | ASVS V3.3                                      |
| Session revocation        | ASVS V3.3, V2.5.5                              |
| Cookie flags              | ASVS V3.4                                      |
| CSRF                      | ASVS V4.2.2, OWASP CSRF Prevention Cheat Sheet |
| Verification/reset tokens | OWASP Forgot Password Cheat Sheet, ASVS V2.5   |
| Account enumeration       | ASVS V2.2.3, OWASP Top 10 A07:2021             |
| OAuth / PKCE              | RFC 9700, ASVS V3                              |
| Transport                 | ASVS V9                                        |
| Audit logging             | ASVS V7                                        |
