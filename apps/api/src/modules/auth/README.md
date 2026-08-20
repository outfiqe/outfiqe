# Auth

## Purpose

Identity and session management: email/password registration and email verification, login/logout, access/refresh token issuance and rotation, forgot/reset password, and the invite-gated registration flows for brand owners and admins.

## Structure

- `auth.service.ts` — `register`/`verifyEmail`/`resendVerification`, `login`, `refresh` (rotating, browser-facing) / `validateSession` (non-rotating, SSR-facing), `logout`, `forgotPassword`/`resetPassword`, `registerBrand`/`getBrandInvite`, `registerAdmin`/`getAdminInvite`, `validateToken` (generic invite/purpose-token existence check), `getCurrentUser`.
- `auth.controller.ts`, `auth.routes.ts` — thin HTTP layer. `/register`, `/verify-email`, `/login`, `/refresh`, `/session`, `/logout`, `/forgot-password`, `/reset-password`, `/resend-verification` are public; `/register/brand` and `/register/admin` require a valid invite token instead of a signed-in session; `/me` requires `requireAuth`.
- `auth.schemas.ts` — zod schemas + inferred body/query types for every route above.
- `auth.repository.ts` — refresh-token and brand-invite/brand-membership persistence. Admin invites live in `../admin-invites/adminInvite.repository.ts`, not here.
- `auth.constants.ts` — `PURPOSE_ERROR_COPY`, the user-facing invalid/expired copy per `TokenPurpose`.
- `auth.types.ts` — `AuthSession`/`BrandAuthSession`, `AuthUser`/`BrandAuthUser`, invite/record shapes.

## Funnel

**User-facing:** sign up with name/email/phone/password → a verification email is sent (console-logged in dev/test when `GMAIL_APP_PASSWORD` isn't set, see `#lib/email.utils.js`) → clicking the link verifies the email → sign in issues an httpOnly `refresh_token` cookie plus a non-httpOnly `has_session` flag cookie (so the client can skip a doomed refresh call when definitely logged out) and an in-memory access token. Forgot/reset password works the same way, off a short-lived signed purpose token, and invalidates every existing session on success. Brand owners and admins never self-register — they redeem a time-limited invite link (issued elsewhere: brand-application approval, admin invite creation) via `/register/brand` / `/register/admin`.

**Technical:** access tokens are short-lived JWTs (`#lib/generate-token.utils.js`); refresh tokens are opaque random values, stored server-side only as a SHA-256 hash (`#lib/opaque-token.utils.js`) with an expiry, and are single-use — `POST /refresh` deletes the presented row and issues a new pair (rotation). `POST /session` intentionally does **not** rotate: it exists for server-side session checks (SSR pages) that call it on every render and have no way to propagate a `Set-Cookie` back to the browser, so rotating there would burn the browser's refresh token on its first server-side use. Email-verification and password-reset links are stateless signed JWTs (`signPurposeToken`/`verifyPurposeToken`, `#lib/purpose-token.utils.js`) scoped by `TokenPurpose`, not persisted anywhere — nothing to look up, just verify the signature/expiry/purpose claim.

## Non-obvious rationale

`forgot-password` and `resend-verification` both return the same success response whether or not the email is registered, and `resendVerification`/`forgotPassword` no-op silently for an unknown or already-verified address — this is deliberate enumeration resistance, not a missing error case.

## Follow-ups

- Integration coverage (`auth.integration.test.ts`) currently covers the core identity/session surface: register, verify-email, resend-verification, login, refresh, session, logout, forgot-password (including its rate limit), reset-password, and `/me`. It does **not** yet cover `registerBrand`/`registerAdmin`/`getBrandInvite`/`getAdminInvite`/`validateToken` — those depend on invite provisioning from `../brand-applications` and `../admin-invites`, which is a natural next phase rather than part of this pass. Once added, `src/modules/auth/**` should go into `vitest.config.ts`'s `coverage.include` allowlist (left out for now since partial coverage would fail the 80% gate).
