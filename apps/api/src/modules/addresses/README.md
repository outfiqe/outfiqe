# Addresses — saved delivery addresses

## Purpose

A per-user address book. A shopper saves one or more delivery addresses, marks one as the
default, and reuses them at checkout instead of retyping name / phone / street / city / landmark
every time. The `Order` row still snapshots the delivery fields it always did (see
`../orders/README.md`); this module only persists reusable copies.

## Structure

- `address.routes.ts` — `GET /`, `POST /`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/default`.
  Every route is `requireShopper` (`[requireAuth, requireRole(UserRole.CUSTOMER)]`) — the
  address book only feeds checkout, which is itself shopper-only (`../orders/README.md`), so a
  `BRAND_OWNER` / `ADMIN` has no use for it and gets a 403. Every write is also behind a
  per-user `rateLimit` (`saved-address-write`, 30/hour).
- `address.controller.ts` — thin: `requireAuthPrincipal` + `validated.*` + `sendSuccess`.
- `address.schemas.ts` — `createAddressSchema` (spreads the shared `shippingAddressFields` from
  `#lib/shipping-address.schemas.js` + `label` + `isDefault`), `updateAddressSchema` (all
  optional, must carry at least one field), `addressIdParamSchema`.
- `address.service.ts` — ownership checks, default toggling, and the
  `MAX_SAVED_ADDRESSES_PER_USER` cap.
- `address.repository.ts` — `SavedAddress` persistence (`prisma.savedAddress.*`).
- `address.types.ts` — `SavedAddressRecord`, `PublicSavedAddress`, `CreateSavedAddressInput`,
  `UpdateSavedAddressFields`.
- `address.utils.ts` — `toPublicSavedAddress` (row → API shape, dates to ISO strings, matching
  the `../orders` mapper convention).

## Funnel

**User-facing:** Dashboard → Settings → Addresses. Add an address (optionally label it "Home" /
"Office", optionally mark it default), edit it, delete it, or switch which one is default. At
checkout the default is pre-selected and the form is pre-filled; picking another saved address
re-fills it (see `apps/web/src/features/addresses/README.md` and
`apps/web/src/features/checkout/README.md`).

**Technical:** `address.routes.ts` → `address.controller.ts` → `address.service.ts` →
`address.repository.ts` → Prisma. Checkout does **not** call this module server-side — the web
app reads the address book, pre-fills the checkout form, and `POST /orders/checkout` receives
the same raw field snapshot it always has. There is intentionally no `savedAddressId` on the
checkout body.

## Non-obvious rationale

**One-default-per-user is enforced in a transaction, not by a DB constraint.** The natural
constraint is a Postgres partial unique index (`... (user_id) WHERE is_default`), but Prisma 7
can't represent a partial index in `schema.prisma`, so a hand-added one shows up as schema drift
and the next `prisma migrate dev` writes a migration to drop it. `bank-accounts` hit the same
wall and settled on a transaction (`clearDefault` then set) — this module follows that pattern
for consistency. The write surface is tiny (a user toggling their own default), so the
clear-then-set race is not a real exposure; `listForUser` orders `isDefault desc` and the client
picks the first, so even a transient double-default degrades gracefully.

**`shippingAddressFields` lives in `#lib`, not imported from `delivery-zones`.** The checkout
body and a saved address validate the identical five fields, so per the repo's "second consumer →
move to shared" rule the field shapes were extracted to
`#lib/shipping-address.schemas.js`. `delivery-zones` keeps its own `citySchema` for its
array/dedup validation; the shared `city` field is an equivalent
`z.string().trim().min(1).max(120)`, kept in sync by hand (both are trivial length bounds).

**Deleting the default promotes the most-recently-updated remaining address.** A user should
never be left with addresses but no default — the next checkout would have nothing pre-selected.
Deleting the last address just leaves the book empty, which the checkout form already handles
(it falls back to the blank form).
