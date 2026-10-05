# Outfit offers (web)

## Purpose

Lets a brand on a locked build pay a creator on the build to post it as their own look, and lets
the creator answer. See `apps/api/src/modules/outfit-offers/README.md` for the rules and money
flow.

## Structure

- `api/offerSchemas.ts`, `api/offerApi.ts` — Zod mirrors of the API's offer views and the calls
  under `/api/outfit-offers`.
- `hooks/useOffers.ts` — offers on a build, received and sent lists, sending (which redirects to
  the payment gateway), paying again, and accept / decline / cancel.
- `hooks/useOfferPaymentCheck.ts` — polls the payment check after the gateway sends the brand
  back, until it's paid, failed or taking too long.
- `hooks/offerQueryKeys.ts` — query keys.
- `components/BuildOffersSection.tsx` — on the build board's side column: "Send an offer" for a
  brand owner who is on the locked build, plus the offers the viewer can see on this build.
  Shoppers who aren't approved creators see nothing.
- `components/SendOfferPanel.tsx` — pick a creator on the build, amount, payment method and an
  optional message. Only members the board marks `canReceiveOffers` (active, approved creator
  shoppers, the same rule the API checks) are listed.
- `components/OfferCard.tsx` — one offer: who, how much, status, deadline, refund state, and the
  actions the viewer's side can take.
- `components/OffersPage.tsx` — the dashboard `/offers` page: a brand account sees the offers it
  sent, everyone else the offers they received (a brand account can never receive one). Linked
  from the dashboard nav ("Offers") for brands and approved creators while Outfit Build is on,
  and from every offer notification; released money notifications go to `/wallet`.
- `testing/offerFixtures.ts` — a full `Offer` builder and the API envelope helper for tests.
- `components/OfferPaymentScreen.tsx` — the page the gateway returns to
  (`app/offers/payment/[provider]/callback/[offerId]`, and `/failed`).

## Funnel

**User-facing.** A brand owner locks a build with a creator on it, opens "Send an offer", picks
the creator, enters an amount, chooses eSewa or Khalti and pays. Back on Outfiqe a screen
confirms the offer was sent. The creator sees the offer on the build and under Offers, accepts
or declines, and after accepting posts the build as a look before the date shown. The brand
follows the offer's status and refund on the same cards.

**Technical.** `SendOfferPanel` → `useSendOffer` → `offerApi.send` (`POST
/api/outfit-offers/builds/:id`, new idempotency key per attempt) → `redirectToPaymentGateway`
(`../payments`) → gateway → `OfferPaymentScreen` → `useOfferPaymentCheck` → `POST
/api/outfit-offers/:id/payment/verify`. Accept / decline / cancel go through `useRespondToOffer`
and refresh every offer query.
