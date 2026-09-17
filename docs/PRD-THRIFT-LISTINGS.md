# Thrift Listings — PRD

Status: **Implemented.** Reflects what shipped, not a proposal — see §9 for the chunk each
piece landed in.

## 1. Goal

Let a brand list secondhand, one-of-a-kind pieces alongside their new stock, without splitting the
catalog into two parallel worlds a shopper has to choose between up front. Thrift is a tag on a
product, not a separate category tree: a thrifted dress is still a dress, filed under the same
`Dresses` category every other dress uses, and shows up in the same browse/search/category views —
marked with a small `Thrift` tag on its card. A shopper who wants to browse only thrift gets a
dedicated, composable filter (`?thrift=true`) that works standalone or scoped to any category.

## 2. Scope

### 2.1 In scope

- A brand-facing `isThrift` flag on product creation/edit, with a required condition disclosure
  (`thriftConditionRating`: Like New/Good/Fair, plus free-text `thriftConditionNotes`) — enforced
  together, only when `isThrift` is set.
- The Thrift tag on every product card surface (shop grid, category rail, brand profile, search,
  wishlist, home rails) and on the product detail page, alongside the condition rating/notes.
- A `thrift` browse filter on `GET /products` (and the `search_products` search path), composable
  with `category`/`type`/`minPrice`/`maxPrice`/`inStock` exactly like every other filter — and a
  `/shop?thrift=true` entry point plus a nav link, satisfying "a separate section."
- One-of-a-kind stock handling: a thrift product is automatically excluded from every
  shopper-facing listing the instant its one unit sells (see §5), since it can never restock.
- A heavier admin review step for thrift submissions: a dedicated filter in the moderation queue,
  and the declared condition surfaced prominently next to the photos before approve/reject.

### 2.2 Non-goals (v1)

- No peer-to-peer selling — thrift listings are still posted by approved brand accounts, same as
  every other product.
- No third-party authenticity/verification service.
- No separate commission rate or payout logic for thrift — revisit only if Finance asks for one.
- No homepage rail — the `/shop?thrift=true` entry point covers "a separate section" for v1; a
  rail (mirroring the On Sale rail's parallel-route pattern) is a clean, additive follow-up.
- No mandatory dedicated "condition photo" distinct from a listing's normal photos — the existing
  image upload plus the required condition notes is the v1 bar for review.

## 3. What a brand does

Checks **"This is a secondhand / thrifted piece"** on the product form (create or edit). Checking
it reveals two more required fields: a condition rating and a short condition note (e.g. "small
mark on the left cuff, otherwise excellent"). Sizes/stock work exactly as for any other product —
a thrift listing is typically one size with a stock of 1, but nothing enforces that at the schema
level; a brand that genuinely has more than one unit of the same secondhand piece can list more.

## 4. What a shopper sees

A `Thrift` tag on the card (bottom-left of the photo — the top-left ribbon is already spoken for
by `New`/`Low stock`/a trending rank, all transient seller-driven states, whereas "this is
secondhand" is a permanent fact about the piece). The tag also names the condition when set (e.g.
"Thrift · Good"). On the product detail page, the same tag plus the brand's condition notes render
near the title. `/shop?thrift=true` browses every thrift piece across the whole catalog; combined
with `?category=<slug>` it scopes to just that category's thrift pieces. Once a thrift piece's one
unit sells, it disappears from every browse/search/rail — see §5 for what a shopper with a stale
link sees instead.

## 5. One-of-a-kind stock — the core design decision

A normal product with zero stock still shows on the site, since it can restock — the existing
out-of-stock product-page treatment already covers that. A thrift product cannot restock by
definition, so once its last unit sells:

- It is **immediately excluded** from `GET /products` (every filter/sort combination),
  `/products/trending`, `/products/new-arrivals`, `/products?sort=on-sale`, and `search_products` —
  unconditionally, not just when a shopper opts into `inStock=true`.
- Its own product page (`GET /products/:id`) **stays reachable** — a shared link, a browser-history
  entry, an old wishlist/cart reference never hits a bare 404 for something that was real moments
  ago — but shows **"Sold — this one-of-a-kind piece is gone"** in place of Add to Cart, reusing the
  exact same disabled-CTA mechanics the ordinary out-of-stock state already uses.
- The **brand's own dashboard** (`/products/mine`) keeps showing it, flagged `isSoldOut`, for their
  own records — sold-out is never applied to that read path.

No new column: sold-out is computed at read time from the same live stock sum every other stock
check in this codebase already uses (`isThriftSoldOut(isThrift, totalStock)`), the same
"derive it, don't store it" approach already established for `lowStock`/`totalStock`.

## 6. Admin review — the heavier step

Thrift listings go through the identical `PENDING → APPROVED/REJECTED` queue as any product — no
new workflow state. What's heavier: the review queue has a dedicated **Thrift** filter so a
moderator can triage these specifically, and the declared condition rating and notes render
directly on the review row, next to the photos, so approving one is an explicit "does this match
what's described" check rather than a generic glance.

## 7. Why this is buildable cheaply — what already existed

| Need                                                      | Already existed                                                                          | Where                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| Conditional-required fields on a create/update schema     | `setProductDiscountSchema`'s discount-type-dependent amount field, via a Zod `.refine()` | `product.schemas.ts`                          |
| A composable browse filter, not a new endpoint            | `inStock`/`minPrice`/`maxPrice` on `buildPublicWhere`                                    | `product.repository.ts`                       |
| Query-param-driven browse with no new route               | `/shop?category=&type=&sort=`                                                            | `shop` feature                                |
| A live-computed status flag instead of a stored column    | `isLowStock(totalStock)`                                                                 | `product.utils.ts`                            |
| An existing out-of-stock product-page treatment to extend | The zero-stock CTA-disable state                                                         | `product-detail/components/ProductDetail.tsx` |
| Design-system form controls for the new fields            | `Checkbox`/`Select`/`Textarea`                                                           | `@outfiqe/design-system`                      |

## 8. Naming note

The platform already has a `Badge`/`UserBadge` gamification concept (collectible achievements,
rarity tiers, profile titles). The Thrift tag is unrelated — a plain product attribute, never an
earned collectible. Don't call it "the Thrift badge" in code or conversation.

## 9. Implementation chunks

- **C0** — schema: `Product.isThrift`, `thriftConditionRating`, `thriftConditionNotes` +
  migration; `search_products` gains `p_thrift` and the always-on sold-out exclusion.
- **C1** — API write path: schemas (conditional-required refine), types, repository
  create/update, mappers.
- **C2** — API browse/search: `thrift` filter, the sold-out exclusion across every public listing
  path, `isSoldOut` on the single-product read.
- **C3** — web posting flow: the Thrift checkbox + condition fields on create and edit.
- **C4** — web card + detail page: the Thrift tag everywhere it renders, condition display, the
  "Sold" state.
- **C5** — web shop browse: the `thrift` filter toggle, `?thrift=true`, the nav entry point.
- **C6** — admin: the Thrift filter tab and condition display on the review queue.
- **C7 (deferred, not built)** — a homepage "Thrift finds" rail, admin analytics on thrift GMV/mix.

## 10. Open questions carried forward

- Should a listing require a dedicated "true condition" photo, distinct from styled shots, before
  it can go to review? Shipped without one for v1 (§2.2) — revisit if condition disputes turn out
  to be common in practice.
- Should un-checking `isThrift` after a listing has been approved need a confirmation step (it
  changes what a buyer was told) or should the flag lock once approved? Currently: allowed,
  unconfirmed, condition fields cleared server-side.
