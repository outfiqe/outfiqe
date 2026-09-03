# creator-links

Backend for creator referral links — chunk 13 of the commerce build. Two link types on
`CreatorLink`:

- `INTERNAL_SINGLE_USE` — dies after its first click. Consumption is the same atomic
  conditional-update pattern as stock decrement: `updateMany({ where: { id, status: 'ACTIVE' },
data: { status: 'CONSUMED' } })`. If it's already consumed (`count === 0`), the visitor still
  reaches the target page — they're just not recorded as a fresh click, so no second attribution
  opportunity opens up from re-sharing a dead link.
- `EXTERNAL_REUSABLE` — persistent, shareable outside Outfiqe (Instagram/TikTok/WhatsApp).
  `getOrCreateExternal` returns the creator's existing ACTIVE link for a given `(creator, product)`
  pair instead of minting a new one every time, so a creator's bio link stays stable.

## Every authenticated endpoint is approved-creator-only

`POST /internal`, `POST /external`, and `GET /mine` all call `requireApprovedCreator`
(`#lib/creator-guard.utils.js`) in the service — a shopper who isn't an approved creator can't
mint or list referral links (`403 NOT_A_CREATOR`). The public `POST /:token/click` endpoint is
deliberately exempt (`optionalAuth`): the visitor following a link is usually an anonymous
buyer, not the creator.

## Session bridging

External-link clicks routinely come from a visitor who isn't logged in yet, so
`CreatorLinkClick.userId` starts null and only `sessionId` is known. `order.attribution.utils.ts`
matches link clicks by `userId`, not `sessionId` — the same rule tag-click attribution already
uses. To make that resolve for external links, `orders.checkout` now accepts an optional
`sessionId` (the same client-side id already used for tag clicks) and calls
`creatorLinkRepository.bridgeSessionClicks(sessionId, userId)` before attribution runs, backfilling
any of this buyer's still-anonymous clicks to their `userId`. Bridging only happens at checkout,
not at login — attribution is only ever read at checkout, so there's nothing to gain from bridging
earlier.

## What isn't built yet (chunk 17)

`shareUrl` on `CreatorLinkView` points at `{FRONTEND_URL}/r/:token}` — that route doesn't exist
yet. Chunk 17 (creator dashboard Share UI) builds the actual landing page: it reads the token,
calls `POST /creator-links/:token/click` with the visitor's local `sessionId` (and their JWT if
they're already signed in, picked up automatically the same way every other authenticated call
does), then redirects client-side using the returned `targetUrl`. This endpoint deliberately
returns JSON instead of doing a server-side HTTP redirect itself, so it can reuse the exact
`sessionId`-in-body pattern tag clicks already use rather than inventing cross-origin cookie
tracking for an anonymous visitor arriving from a raw top-level navigation.

No rate limiting on the public click endpoint, matching the existing (also public, also
unauthenticated) creator-look tag-click endpoint's precedent — recording an extra click is low
stakes, and internal-link abuse is already capped by single-use consumption.
