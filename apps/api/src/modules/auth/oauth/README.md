# OAuth (Google / Facebook sign-in)

## Purpose

Google and Facebook social login for `../` (the parent `auth` module) — a second way to prove identity and get the same session (JWT access token + rotating refresh token) the email/password flow already issues, not a parallel auth system.

## Structure

- `oauth.constants.ts` — `OAuthProviderParam` (enum: `GOOGLE = "google"`, `FACEBOOK = "facebook"`, the lowercase route/query-facing identifier) and `OAuthCallbackStatus` (enum: `SIGNED_IN`, `LINK_REQUIRED`, the outcome of a callback), plus the PKCE state TTL and `/start` rate-limit thresholds.
- `oauth.types.ts` — `OAuthProfile`, the normalized identity shape every provider adapter returns regardless of which provider it came from; `OAuthCodeExchangeInput`, the normalized input every adapter takes; `OAuthStateRecord`/`OAuthLinkPendingRecord`, the Redis-stored ephemeral shapes; `OAuthIdentityResolution`/`OAuthCallbackResult`, the service layer's outcome types.
- `oauth.schemas.ts` — zod request validation: `oauthProviderParamsSchema` (`:provider` route param against `OAuthProviderParam`), `oauthStartQuerySchema`, `oauthCallbackQuerySchema`.
- `oauth.repository.ts` — `oauthRepository`, the `OAuthIdentity` persistence layer (`findByProviderIdentity`, `createOAuthIdentity`, `findActiveOAuthIdentitiesForUser`, `revokeOAuthIdentity`).
- `oauth.service.ts` — `oauthService.startOAuthFlow`/`handleOAuthCallback`. Builds the PKCE challenge and provider authorization URL, stores/consumes the Redis-backed state, and resolves an identity to one of: sign in an existing linked identity, flag "link required" when the provider email matches an existing account with no linked identity yet, or auto-create a new account.
- `oauth.controller.ts` — `oauthController.start`/`callback`. Both are full browser navigations (not fetch calls), so both always end in an HTTP redirect — to the provider on `start`, and on `callback` either straight to the caller's original destination (signed in, cookies set), or to the frontend's `/auth/oauth-callback` page carrying a `linkToken`/`email` (link required) or an `error` code (any failure) in the query string. A callback failure never falls through to the JSON error handler mid-navigation — the controller catches it and redirects.
- `oauth.routes.ts` — `GET /:provider/start` (IP rate-limited), `GET /:provider/callback`. Mounted flat at `/api/auth/oauth` in `app.ts`, alongside (not nested inside) `/api/auth`, matching this codebase's flat route-mounting convention.
- `oauth.utils.ts` — `sanitizeOAuthRedirectPath`, module-local open-redirect guard: only a same-origin relative path (`/...`, never `//...` or an absolute URL) is honored as the post-login destination; anything else falls back to `/`.
- `providers/google.provider.ts` — `exchangeGoogleAuthorizationCode`. Exchanges an authorization code for tokens via `google-auth-library`'s `OAuth2Client`, then verifies the returned `id_token`'s signature against Google's live JWKS (never decodes-and-trusts it) before returning an `OAuthProfile`.
- `providers/facebook.provider.ts` — `exchangeFacebookAuthorizationCode`. Exchanges an authorization code for a Graph API access token, then fetches the profile from `/me` with an `appsecret_proof` (HMAC-SHA256 of the access token, keyed by the app secret) on every call.

## Funnel

**User-facing flow:** clicking "Continue with Google/Facebook" navigates the whole page to `GET /api/auth/oauth/:provider/start`, which redirects again to the provider's own consent screen. After the user approves, the provider redirects back to `GET /api/auth/oauth/:provider/callback`. From there the browser lands on one of three places: straight back into the app already signed in (the original page they started from); the frontend's OAuth callback page asking them to confirm linking by re-entering their password (their provider email already belongs to an existing account); or that same page showing a generic sign-in-failed message.

**Technical flow:** `oauth.routes.ts` → `oauth.controller.ts` (`start`) → `oauth.service.ts` generates a PKCE verifier/challenge and an opaque `state`, stores `{provider, codeVerifier, redirectAfter}` in Redis (`redisKeys.oauthState`, ~10 min TTL) → redirects to the provider. On `callback`, `oauth.controller.ts` → `oauth.service.ts` atomically consumes the state (get + delete), calls the matching `providers/*.provider.ts` adapter to exchange the code, then resolves the identity via `oauth.repository.ts` and `#modules/users/user.repository.ts` — reusing `issueTokens` from `../auth.service.ts` for the actual session issuance, the same function password login uses. A "link required" outcome stores `{userId, provider, providerUserId, emailAtLinkTime}` in Redis (`redisKeys.oauthLinkPending`) keyed by an opaque `linkToken`, to be consumed by the authenticated link endpoint added in a follow-up chunk.

## Non-obvious rationale

Both provider adapters are deliberately symmetric — same input shape (`OAuthCodeExchangeInput`), same output shape (`OAuthProfile`), same failure behavior (every failure, at any step, collapses to one generic `AppError("OAUTH_EXCHANGE_FAILED", ...)` with the real cause logged server-side only, never in the response) — so the code that calls them doesn't need to special-case either provider. Neither adapter enforces "the email must be verified" as a hard rejection itself; each just reports what the provider said (`emailVerified: boolean` on Google, always `true` on Facebook since the Graph API only returns `email` at all for a confirmed address). Whether an unverified email blocks sign-in is a single policy decision applied in `oauth.service.ts`, identically to both providers, not duplicated per adapter.

Facebook's Graph API is called with `fetch` directly (matching `../../payments/providers/khalti.provider.ts`'s convention) rather than a Facebook SDK — there's no first-party Node SDK worth adding a dependency for, and the calls involved are two plain HTTPS requests.

PKCE/state and the pending-link handoff live in Redis with a short TTL, following the same ephemeral-state pattern already used for rate-limit counters and distributed locks (`#redis/redis.keys.ts`), rather than introducing a new session-middleware mechanism just for this flow.

`OAuthProviderParam` and `OAuthCallbackStatus` are real TypeScript enums, not string-literal unions — matching this codebase's existing `TokenPurpose`/`TokenTypeEnum` convention (`#constants/enums/auth.enum.ts`) and CLAUDE.md's "use enums, not bare strings" rule. Their values stay lowercase (`"google"`, `"facebook"`) because they double as the literal `:provider` URL path segment and Redis-stored `state.provider` value — no separate string↔enum mapping layer is needed for routing, only the existing `PROVIDER_PARAM_TO_ENUM` map in `oauth.service.ts` to bridge into the Prisma-generated, uppercase `OAuthProvider` enum used for persistence.

Never auto-signs-in on an email match alone: finding an existing user by the provider's email with no prior `OAuthIdentity` row always returns `link_required`, never a session. Silently merging on email match would let anyone who controls a matching email address at the OAuth provider take over an existing Outfiqe account.

`oauth.controller.ts`'s `callback` handler is the one place in this codebase where a caught application error is deliberately turned into a redirect instead of the global JSON `errorHandler` — because the caller mid-navigation is a browser following a `Location` header from Google/Facebook, not a script that can read a JSON error body.
