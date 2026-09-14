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

**One-default-per-user is enforced by a `Serializable` transaction with automatic conflict
retry, not by a DB constraint.** The natural constraint is a Postgres partial unique index
(`... (user_id) WHERE is_default`), but Prisma 7 can't represent a partial index in
`schema.prisma`, so a hand-added one shows up as schema drift and the next `prisma migrate dev`
writes a migration to drop it. `bank-accounts` hit the same wall and settled on a plain
transaction (`clearDefault` then set) at the database's default `ReadCommitted` isolation; this
module used to follow that exact pattern too, on the stated assumption that the write surface was
too small for the clear-then-set race to be a real exposure. **That assumption was wrong** — an
audit found that two concurrent `setDefault`/`create`/`update`/`remove` calls that both need to
change the default can genuinely leave two `SavedAddress` rows with `isDefault: true` (or, for a
delete-while-promoting race, zero). Under `ReadCommitted`, the second transaction's `clearDefault`
blocks on the row the first transaction is also clearing; once the first commits, Postgres
re-evaluates that specific row against the `WHERE isDefault = true` predicate, finds it no longer
matches (the first transaction already flipped it), and silently updates zero rows instead of the
row the second transaction actually needed to clear — so the second transaction goes on to set its
own address default too, alongside the first's. `listForUser`'s `isDefault desc` ordering doesn't
save this: `AddressCard` renders a "Default" badge per row from that row's own `isDefault` field,
so two default rows show two visible "Default" badges, and there's no guarantee the promoted-on-delete
address stays the visible one either. Reproduced deterministically in
`address.integration.test.ts` ("never leaves two addresses marked default when two set-default
requests race") by pausing one request's `clearDefault` call (via a spy) until a second, concurrent
request's own `clearDefault` has blocked on the same row, then releasing it — this fails
against the old `ReadCommitted` transaction every time. Fixed by running `create`/`update`/
`remove`/`setDefault` at `Prisma.TransactionIsolationLevel.Serializable` (same mechanism
`withdraw.service.ts#createRequest` already uses for its own concurrent-balance guard) wrapped in
the existing `runWithDeadlockRetry` (`#lib/prisma.utils.js`, already used by
`crm-access.repository.ts#acceptInvite`): under `Serializable`, the second transaction's blocked
`clearDefault` raises a real conflict (`P2034`) instead of silently skipping the row once it
unblocks, and `runWithDeadlockRetry` transparently retries the whole transaction against the
now-committed state — so the user never sees an error, and the invariant holds under concurrency
without a schema migration.

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
