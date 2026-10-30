# @outfiqe/client

## Purpose

The API client the web and admin apps use to talk to the backend. It adds the access token and CSRF header to each request, and renews the session when a token expires.

## Structure

- `src/client/index.ts` — `createApiClient`, the axios wrapper, its token storage and its retry after a 401.
- `src/client/sessionRefresh.ts` — decides whether a failed refresh means the session is really over.
- `src/errors/` — `ApiClientError`, the one error type callers catch.
- `src/chat/`, `src/conversations/`, `src/notifications/`, `src/uploads/` — typed calls shared by both apps.
- `src/idempotency/` — the idempotency key helpers.

## Funnel

What a person sees: they stay signed in while using the app. If their token has expired, the request quietly renews it and carries on. They are only signed out when the server says their session is over.

How it works: a request goes out with the access token. On a 401 the client calls `/auth/refresh` once, sharing one refresh between requests that fail together, then repeats the request with the new token.

## Non-obvious rationale

- **Only a 401 or 403 from the refresh signs someone out.** A rate limit, a server error or a dropped connection says nothing about the session, and signing a shopper out for a moment of bad mobile signal would throw them out of checkout. In those cases the request fails with its normal error and the next one tries again.
