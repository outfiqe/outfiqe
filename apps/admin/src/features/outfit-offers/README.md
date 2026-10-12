# Build offers (admin)

## Purpose

Lets finance staff follow the money in Outfit Build offers and settle disputes: release an offer
to the creator, refund the brand, or record a refund that was made by hand (eSewa has no refund
API). Every action needs a reason and is written to the platform audit log by the API.

## Structure

- `components/OffersSection.tsx` — shown on the Commissions page: filter tabs (waiting on creator, accepted,
  posted, released, needs manual refund), one row per offer, and the actions allowed for its
  state, each confirmed with a reason in `TextPromptModal`.
- `hooks/useInfiniteOffers.ts` — cursor-paged list per filter.
- `api/outfitOffersApi.ts` — `offersApi.list(filter, cursor)` and `offersApi.act(offerId, action, reason)`.
- `api/outfitOffersSchemas.ts` — Zod mirror of the API's offer view.

## Funnel

**User-facing.** An admin opens Commissions, scrolls to Build offers, picks a tab, and uses
Release, Refund or Mark refunded on an offer, typing the reason.

**Technical.** `OffersSection` → `useInfiniteOffers` / `offersApi.act` → `GET
/api/outfit-offers/admin`, `POST /api/outfit-offers/admin/:offerId/release|refund|mark-refunded`
→ `apps/api/src/modules/outfit-offers`. Reading needs `platform:commissions:read`; acting needs
`platform:commissions:manage`.
