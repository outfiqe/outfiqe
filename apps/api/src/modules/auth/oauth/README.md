# OAuth (Google / Facebook sign-in)

## Purpose

Google and Facebook social login for `../` (the parent `auth` module) — a second way to prove identity and get the same session (JWT access token + rotating refresh token) the email/password flow already issues, not a parallel auth system.

## Structure

- `oauth.types.ts` — `OAuthProfile`, the normalized identity shape every provider adapter returns regardless of which provider it came from; `OAuthCodeExchangeInput`, the normalized input every adapter takes.
- `providers/google.provider.ts` — `exchangeGoogleAuthorizationCode`. Exchanges an authorization code for tokens via `google-auth-library`'s `OAuth2Client`, then verifies the returned `id_token`'s signature against Google's live JWKS (never decodes-and-trusts it) before returning an `OAuthProfile`.
- `providers/facebook.provider.ts` — `exchangeFacebookAuthorizationCode`. Exchanges an authorization code for a Graph API access token, then fetches the profile from `/me` with an `appsecret_proof` (HMAC-SHA256 of the access token, keyed by the app secret) on every call.

This module still only has the provider adapters — the actual `GET /auth/oauth/:provider/start` / `callback` flow, PKCE/state handling, account linking, and the `oauth_identities` persistence layer land in a follow-up change (`oauth.service.ts`/`oauth.repository.ts`/`oauth.controller.ts`/`oauth.routes.ts`). This README will grow a Funnel section once that flow exists.

## Non-obvious rationale

Both provider adapters are deliberately symmetric — same input shape (`OAuthCodeExchangeInput`), same output shape (`OAuthProfile`), same failure behavior (every failure, at any step, collapses to one generic `AppError("OAUTH_EXCHANGE_FAILED", ...)` with the real cause logged server-side only, never in the response) — so the code that calls them doesn't need to special-case either provider. Neither adapter enforces "the email must be verified" as a hard rejection itself; each just reports what the provider said (`emailVerified: boolean` on Google, always `true` on Facebook since the Graph API only returns `email` at all for a confirmed address). Whether an unverified email blocks sign-in is a single policy decision that belongs in `oauth.service.ts`, applied identically to both providers, not duplicated per adapter.

Facebook's Graph API is called with `fetch` directly (matching `../../payments/providers/khalti.provider.ts`'s convention) rather than a Facebook SDK — there's no first-party Node SDK worth adding a dependency for, and the calls involved are two plain HTTPS requests.
