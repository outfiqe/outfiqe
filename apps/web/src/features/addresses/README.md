# Addresses

## Purpose

The shopper-facing address book: manage saved delivery addresses from Dashboard → Settings →
Addresses, and pick one at checkout instead of retyping. Backed by the API `addresses` module
(`apps/api/src/modules/addresses`).

## Structure

- `api/addressSchemas.ts` — `savedAddressSchema` / `savedAddressListSchema` (server shape) and
  `addressFormSchema` (`AddressFormInput`, the create/edit form — same field bounds as the
  backend, kept in sync by hand).
- `api/addressApi.ts` — `list / create / update / remove / setDefault` over `/addresses`.
- `hooks/useAddresses.ts` — the list query (`ADDRESSES_QUERY_KEY = ["addresses"]`, `enabled`
  only for a shopper account, so a brand-owner viewing the page never fires the 403 request). `hooks/useCreateAddress.ts` / `useUpdateAddress.ts` / `useDeleteAddress.ts` /
  `useSetDefaultAddress.ts` — the mutations, each invalidating `ADDRESSES_QUERY_KEY`.
- `components/AddressList.tsx` — the settings section: heading, "Add address", loading / error /
  empty states, the list. Renders `<NotAShopperNotice>` instead for a brand-owner / admin
  account (the address book is shopper-only, matching the `/addresses` API's `requireShopper`
  gate); `useDashboardNav` also drops the Addresses item from the brand sidebar, so this is the
  URL-typed fallback.
- `components/AddressCard.tsx` — one saved address: label, recipient, address line, default
  badge, and the "Set as default" / "Edit" / "Delete" (confirm `Modal`) actions.
- `components/AddressFormModal.tsx` — the add/edit form (`Modal` + RHF), reusing
  `CityAutocomplete` from `delivery-zones`. Editing the current default keeps the "default"
  checkbox checked and disabled — there is always exactly one default.
- `components/SavedAddressPicker.tsx` — the checkout radiogroup (saved addresses + "Use a new
  address"); consumed by `checkout`'s `CheckoutForm`, not by the settings page.

## Funnel

**User-facing:** Settings → Addresses → add / edit / delete / set default. At checkout, if any
address is saved, a picker appears with the default pre-selected and the delivery form
pre-filled; choosing another saved address re-fills it, "Edit these details for this order"
unlocks the fields without touching the saved copy, and "Use a new address" shows a blank form
with a "Save this address for next time" checkbox.

**Technical:** `AddressList` → `useAddresses` → `addressApi.list` → `GET /addresses`. Mutations
follow the same `addressApi` → REST path. Checkout imports `SavedAddressPicker`, `useAddresses`,
and `useCreateAddress` from this feature's barrel; the address chosen there is submitted as the
normal delivery-field snapshot in `POST /orders/checkout` — there is no `savedAddressId` on the
checkout request (see `apps/api/src/modules/addresses/README.md`).
