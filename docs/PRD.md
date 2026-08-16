# Outfiqe Commerce System — PRD

Internal reference doc, committed to the repo. This is a full behavioral spec of
everything designed and built this session: for every significant action a person can
take, what happens step by step across every app and every side effect it triggers, not
just a feature list. Branch: `feat/commerce-system` (PR #30). `TESTING.md` (also
committed) is the human test pass derived from this.

---

## 1. Goal

Turn Outfiqe from "browse and post" into a working marketplace: a shopper can actually
buy something and pay for it, a brand can actually get paid for what it sells, and an
approved creator can actually earn money when their tagged post or referral link causes
a sale — all of it correct and concurrency-safe from the first commit, not hardened
after the fact, because this ships to real public users with no soft-launch period.

## 2. Scope

### 2.1 In scope (built this session)

- Inventory with real per-size stock, atomic under concurrent demand.
- Server-side cart, checkout, and order lifecycle.
- Three payment methods — Cash on Delivery, eSewa, Khalti — behind one interface.
- Buyer order tracking and a full payment/refund transaction ledger.
- Creator commission system: price-tiered payouts, three attribution channels (tag
  clicks, single-use links, reusable links), a lifecycle sweep, and a creator-facing
  earnings dashboard.
- Creator referral links: generation, a public click/redirect landing page, and
  anonymous-visitor session bridging so a not-yet-logged-in click still earns commission
  once that visitor eventually buys.
- Admin tooling: order visibility/fulfilment/cancel-refund, commission tier management,
  manual commission overrides, order fee configuration with an audit trail.
- Brand dashboard order visibility, scoped correctly even inside mixed-brand orders.

### 2.2 Explicitly out of scope (non-goals, not oversights)

- Partial refunds — refunds are always full-order.
- A standalone post-delivery return flow (only pre-shipment cancellation exists).
- Modeling Outfiqe's own platform fee/take-rate against commission economics.
- Automated cleanup of old idempotency records.
- Rate-limiting share-link generation.
- A dedicated background-worker service — the payment-reconciliation and
  commission-lifecycle sweeps run in-process on an interval, deliberately built with a
  seam to swap to a real worker later without touching the job logic itself.
- Anything about auth, browsing, following, wishlists, or the explore feed — those
  existed before this session and weren't touched except where a flow below explicitly
  crosses into them (e.g. attribution reading an existing tag-click table).

## 3. System map

Three apps share one Postgres database through one API:

- **`apps/api`** — Express + Prisma. Owns every rule and every write. Neither frontend
  app ever talks to the database directly.
- **`apps/web`** (Next.js) — the single public-facing app. Serves shoppers on the main
  site, **and** serves creators and brand owners on the same app's `/dashboard/*` routes
  (role-gated at the page level, not a separate app).
- **`apps/admin`** (Vite/React) — internal-only, ops/admin logins only.

So "what happens in all the apps" for a given action generally means: an API call
changes the database → **web** reflects it wherever the acting user looks next (their
orders, their earnings, their dashboard) → **admin** reflects it in the relevant
moderation/management queue → and, for a few actions, an **email** goes out to the buyer
and/or to ops.

## 4. Actors

| Actor       | Where they act                                 | Can become                                                |
| ----------- | ---------------------------------------------- | --------------------------------------------------------- |
| Shopper     | `apps/web` (public site)                       | Creator and/or brand owner, without losing shopper access |
| Creator     | `apps/web` `/dashboard/{posts,share,earnings}` | —                                                         |
| Brand owner | `apps/web` `/dashboard/{products,orders}`      | —                                                         |
| Admin (ops) | `apps/admin`                                   | —                                                         |

---

## 5. Complete flows

Each flow traces one real action end to end: what the person clicks, what the API does
(including inside a DB transaction vs. outside it, where that boundary matters), and
what becomes visible afterward in web, admin, and email.

### 5.1 Browse → add to cart

1. Shopper opens a product page (`apps/web`, `/product/[id]`). Stock per size is read
   live — not cached — from `ProductSize.stock`.
2. Picks a size, clicks Add to bag → `POST /api/cart` (or an update to an existing line).
3. **API**: finds-or-creates the shopper's `Cart`, upserts a `CartItem`. If the requested
   quantity exceeds live stock, it's silently clamped to what's actually available
   (never blocks the add, never oversells the UI).
4. **Web**: the cart badge in the header updates immediately (React Query cache); `/cart`
   shows the line with live-rechecked stock every time it's opened (a size that sold out
   between add and checkout shows as sold out there, excluded from the total, not a hard
   error).
5. Nothing changes in **admin** or **brand dashboard** yet — a cart isn't a sale.

### 5.2 Checkout — Cash on Delivery

1. Shopper fills the address form and payment method (COD) on `/checkout`, submits with
   a fresh idempotency key.
2. **API** (`POST /api/orders/checkout`): claims the idempotency key first (insert with a
   unique-constraint conflict = the atomic claim — a duplicate submit gets a 409, never a
   second order). Then, inside one short transaction:
   - Re-checks stock and **decrements it immediately** (COD has no gateway step, so the
     order is as final as it'll ever be).
   - Resolves attribution for each line item (see §5.12–5.14) and creates a `PENDING`
     `CreatorCommission` for anything eligible, in the same transaction as the order.
   - Creates the `Order` (+ `OrderItem`s) with `paymentStatus: DUE`,
     `fulfilmentStatus: PLACED`, and a `PaymentTransaction{type: PAYMENT, status:
SUCCEEDED}` row (COD "succeeds" immediately in the sense that the commitment is
     made; the cash itself isn't collected until delivery).
3. Cart is cleared. Confirmation and ops-notification emails send (outside the
   transaction).
4. **Web (buyer)**: lands on `/orders/[orderId]` showing the order and a Placed status.
   Shows up in `/orders` (list) immediately.
5. **Web (brand dashboard)**: each involved brand's `/dashboard/orders` gets a new line
   item for their own product(s) in that order — scoped to _items_, not the whole order,
   since a cart can span multiple brands.
6. **Admin**: the order appears in Orders, status Placed/Due.
7. **Creator earnings** (only if an item was attributed): a `PENDING` commission now
   shows on the creator's `/dashboard/earnings`, and in admin's Commissions queue.

### 5.3 Checkout — eSewa or Khalti (wallet)

1. Same address/idempotency flow as COD, but stock is **not** decremented at checkout —
   `paymentStatus: INITIATED`, no gateway step has happened yet.
2. **Web**: on success, calls `POST /api/payments/:orderId/initiate`. eSewa returns a
   signed form-post payload (`{formUrl, fields}`) which the browser auto-submits as a
   real `<form>` POST, navigating away to eSewa's hosted page. Khalti's `initiate` is
   itself a real server-to-server call that returns a `redirectUrl`; the browser just
   navigates there directly.
3. Shopper pays on the gateway's own page (outside our app entirely).
4. Gateway redirects back to `/payments/{esewa|khalti}/callback?orderId=...` regardless
   of success or failure — **that redirect and its query params are never trusted**.
5. **Web callback page**: polls `POST /api/payments/:orderId/verify` (capped at 10
   attempts / 30s). That endpoint always makes its own fresh server-to-server status call
   to the gateway using our own stored transaction reference, never the redirect data.
6. **On COMPLETE**: inside a transaction, the `PaymentTransaction` is marked `SUCCEEDED`,
   stock is decremented **now** (this is the point where a wallet order's stock actually
   leaves inventory), and `Order` flips to `paymentStatus: PAID, fulfilmentStatus:
PLACED`. If the decrement fails (sold out in the gap since checkout), the order is
   instead flagged `needsManualRefund` and ops gets an alert email — the payment can't be
   undone from our side, so it's surfaced for a human instead of silently mishandled.
7. **On FAILED**: the transaction is marked `FAILED`, stock was never touched, and the
   callback page shows a **Try again** button that re-initiates payment for the _same_
   order (the bag isn't lost, no new order is created).
8. From here, web/admin/brand-dashboard visibility matches §5.2 exactly once `PAID`.

### 5.4 Payment left hanging (no callback ever arrives)

1. A background sweep (in-process interval, Redis-mutex-guarded so multiple API
   instances can't double-process the same batch) runs on a schedule.
2. Orders `INITIATED` for 5–60 minutes get a fresh verify call (catches a missed
   callback). Orders `INITIATED` past 60 minutes are expired to `paymentStatus: FAILED`
   with no stock to restore (none was ever taken).
3. No visible action needed from the shopper for the expiry case; if the sweep's verify
   call _does_ find it actually completed, it settles exactly as in §5.3 step 6.

### 5.5 Buyer tracks an order

1. `/orders` lists the shopper's own orders only (never another account's, enforced
   server-side, not just hidden in the UI).
2. `/orders/[orderId]` shows a 4-step tracker (Placed/Packed/Shipped/Delivered, current
   step marked both visually and via `aria-current="step"`) plus the full
   `PaymentTransaction` ledger (every payment _and_ refund attempt, not just the latest).

### 5.6 Admin advances fulfilment

1. Admin opens an order in `apps/admin` Orders, clicks "Mark as packed" (then shipped,
   then delivered) — only ever the _next_ step is offered, never a skip.
2. **API**: atomic conditional update, guarded by the exact status being left.
3. Reaching **Delivered** stamps `Order.deliveredAt` — this is the field the commission
   sweep (§5.15) has been waiting on the whole time.
4. **Web (buyer)**: tracker updates next time the order page is viewed.
5. Once Delivered, the order can no longer be cancelled — the "Cancel order" action
   disappears in admin.

### 5.7 Admin cancels an order (with refund if needed)

Only available pre-shipment (Placed/Packed).

1. Admin clicks **Cancel order**, enters a required reason.
2. **API**: if `paymentStatus === PAID`, a refund is attempted _first_, before any DB
   transaction opens (external gateway call never spans a transaction):
   - **Khalti**: a real automated refund call against Khalti's API, using the buyer's
     phone number and the gateway's own settlement-time transaction id (pulled from the
     stored raw verify response, not the value used at initiate time — those are two
     different Khalti identifiers).
   - **eSewa / COD**: no programmatic refund API exists for either — this is pure
     record-keeping; the admin's click _is_ the confirmation a human already refunded
     the buyer outside Outfiqe.
3. Then, in one transaction: `fulfilmentStatus → CANCELLED`, stock is restored for every
   item, and any non-terminal commission tied to the order's items is `VOIDED` — all
   atomic, all one unit (not three separate writes that could partially apply).
4. If the refund call itself failed, the order is still cancelled (stock/commissions
   don't wait on a gateway's cooperation) but flagged `needsManualRefund`, and ops gets
   an email instead of the buyer being told it succeeded.
5. **Web (buyer)**: gets a cancellation email (and a refund-confirmation email if the
   refund succeeded).
6. **Web (creator earnings)**: a voided commission disappears from "available to earn"
   and shows as Voided with the reason, so a creator can see _why_ an expected payout
   didn't land instead of it silently vanishing.
7. **Brand dashboard**: the order line item's status updates to Cancelled next time
   viewed.

### 5.8 Brand: list a product, get approved, see sales

1. Brand owner adds a product (`/dashboard/products`) — images, price, category, sizes
   with real stock counts. Starts `PENDING`.
2. Admin reviews it in `apps/admin` Products, approves (or rejects with it staying
   invisible). Approval email to the brand.
3. **Web**: product becomes visible on the public storefront the moment it's approved.
4. Once it sells (as part of any order, alone or mixed with other brands' items): that
   brand's `/dashboard/orders` shows the line item — product, size, qty, price, and that
   order's current payment/fulfilment status — with **no other brand's items and no
   buyer PII** visible, even though it's the same underlying order other brands might
   also have a line in.

### 5.9 Someone applies to become a creator, gets approved

1. Any signed-in shopper clicks **"Apply to become a creator"** in their dashboard — a
   single click, no form. `creatorStatus → PENDING`. Dashboard's Posts/Share/Earnings
   tabs show an "under review" message instead of their real content while pending.
2. Admin approves in `apps/admin` Creators. Approval email sent.
3. **Web**: Posts/Share/Earnings unlock immediately on next load — no separate
   "activation" step.

### 5.10 Creator posts a look

1. Approved creator uploads 1–6 images, writes a caption, tags up to 6 products from a
   live product search (`/dashboard/posts`).
2. **Web (public)**: the look becomes visible in the public explore feed and on each
   tagged product's page ("seen on creators"), immediately, with its tags — this is the
   surface that produces organic tag-click attribution (§5.12), distinct from the
   deliberate referral links in §5.13/5.14.

### 5.11 Organic attribution — a shopper clicks a tagged product

1. A signed-in shopper taps a tag pill on a creator's post (in the feed, or "seen on
   creators" on a product page). **Web** records a `CreatorLookTagClick` row
   (`userId`, `productId`, the creator's look, a source: feed vs. product page).
2. If that same shopper buys that same product within the next **7 days**, and the
   creator who posted it is (still) **approved**, and the buyer isn't the creator
   themselves — a commission is created at checkout time (§5.2/5.3), tagged
   `source: TAG_CLICK`.
3. If multiple qualifying clicks/links exist for the same purchase, **last-click-wins**
   across _all three_ attribution channels combined, not per-channel — evaluated by one
   shared eligibility rule so the three sources can't drift into inconsistent behavior.

### 5.12 Creator generates and shares a one-time link

1. Creator picks a product on `/dashboard/share`, clicks **Generate one-time link**.
2. **API**: creates a `CreatorLink{type: INTERNAL_SINGLE_USE}` with a cryptographically
   random token. Returns immediately; the creator's "Your links" list updates in place
   (no extra network round trip — the new link is patched directly into the cached list).
3. Creator copies the URL (`{FRONTEND_URL}/r/{token}`) and sends it to one specific
   person (DM, message, etc. — this is the "for one person" link type, generating many
   of them for different people is the intended pattern, not a limit).
4. **Recipient clicks it**: lands on `/r/[token]` (public, no login required). That page
   reads the visitor's local session id, calls `POST /api/creator-links/:token/click`,
   which **atomically consumes** the link (same conditional-update pattern as stock
   decrement — first click wins, full stop) and returns the product's real URL, which
   the page then redirects to. A second click on the same (now-dead) token still
   redirects the visitor through fine — it just records no further attribution
   opportunity.
5. If that visitor buys the product within 7 days (and isn't the creator, and the
   creator is still approved): commission created, `source: INTERNAL_LINK`.

### 5.13 Creator generates a reusable link (and anonymous-visitor attribution)

1. Creator clicks **Get reusable link** for a product (or **Get my profile link** for a
   generic, non-product-specific link). **API** returns the creator's _existing_ active
   link for that exact pairing if one exists, rather than minting a new one — the URL
   stays stable for a bio link.
2. Creator posts it on Instagram/TikTok/wherever. Every click is recorded (unlike the
   one-time link, there's no consumption — it can be clicked indefinitely).
3. **The interesting case — a cold, logged-out visitor clicks it**: `/r/[token]` records
   the click with only a local `sessionId` (no `userId` yet, since the visitor isn't
   signed in). The click is _not_ immediately attributable.
4. That visitor later signs up or logs in, browses, and eventually **checks out** (any
   product, any time) — checkout now sends that same `sessionId` along, and the API
   **bridges** any of that session's still-anonymous clicks to the now-known `userId`
   _before_ resolving attribution for that checkout. This is deliberately the only place
   bridging happens (not at login) — attribution is only ever read at checkout, so
   there's nothing to gain from bridging earlier.
5. From here, if the bridged click's product matches something in the cart and it's
   still within the 7-day window: commission created, `source: EXTERNAL_LINK`.

### 5.14 Commission lifecycle — from sale to payout

1. A commission is born `PENDING` at checkout (§5.2/5.3), snapshotted with the tier
   amount that applied _at that moment_ — a later tier price-band edit never
   retroactively changes an already-created commission.
2. It shows on the creator's `/dashboard/earnings` (Pending tile) and in admin's
   Commissions queue immediately.
3. Roughly 7 days after the order's `deliveredAt` (§5.6) is stamped, a lifecycle sweep
   (same interval/mutex pattern as payment reconciliation) flips it straight to
   `AVAILABLE` (no separate holding period was ever defined between "approved" and
   "available," so they're one transition).
4. If the order is cancelled or its payment fails/refunds before then, the sweep instead
   `VOID`s the commission automatically.
5. Admin can also intervene manually at any point (§5.16) — approve early, void with a
   reason (covers cases the automatic sweep can't, like a very late refund on an
   already-available commission), or mark paid.
6. **Mark paid** is manual, ops-only — there's no disbursement API in v1. Once marked,
   it shows as Paid on the creator's earnings page; that's the end of the lifecycle.

### 5.15 Admin manages commission tiers — the actual rule, and how it applies

The tier table is the entire "rule" admin controls over commission economics: it's a set
of price bands, each with a **fixed** payout (not a percentage of sale). `minPrice`,
optional `maxPrice` (no max = open-ended), `amount`.

**Managing it** (`apps/admin` → Commissions):

1. **Add** a new band. **Edit** an existing band's amount or range — validation rejects a
   max price that isn't above the min.
2. **Delete** — rejected with a clear message (not a raw database error) if any
   commission already references that tier; a genuinely unused tier deletes freely.

**How a band actually gets applied to a sale** — this only happens once, at the moment a
commission is _created_ (checkout time, §5.2/5.3), for each attributed line item:

1. The tier whose `[minPrice, maxPrice]` band contains the item's **sold price** is
   looked up (the highest matching `minPrice` band wins if ranges could overlap).
2. That tier's `amount` is **copied onto the commission row right then** — a snapshot,
   not a live reference. Editing a tier afterward only affects _future_ sales; every
   commission already created keeps the amount it was born with, permanently, even if
   admin changes or deletes that tier a minute later.

**The gap case** — if a sold price falls **outside every band** (a hole between tiers,
or nothing covering very cheap/very expensive items), the lookup returns nothing and
**no commission is created at all** for that line — silently: no error, no log, the
attribution itself is still recorded on the order, but the creator simply doesn't earn
on that sale. This isn't validated or blocked anywhere, since a gap might be an
intentional business decision (e.g. "no commission under Rs. 200") rather than a
mistake. To keep coverage complete: the lowest tier's `minPrice` should stay `0`, the
highest tier's `maxPrice` should stay open-ended (`null`), and adjacent bands shouldn't
leave a hole between them. **Verified against the live tier data as of this writing**:
`0–1499 → 1500–1999 → 2000–2999 → 3000–3999 → 4000–4999 → 5000+`, fully contiguous,
no gap currently exists — but nothing in the system would catch it if one were
introduced later.

### 5.16 Admin manually overrides a commission

1. From the Commissions queue, admin can **Approve** (Pending → Available, same
   transition the sweep does automatically, just triggered by hand), **Void** (requires
   a reason; works from Pending, Approved, _or_ Available — deliberately broader than
   the automatic sweep's Pending-only void, to cover a late refund the sweep can't catch
   on its own), or **Mark paid** (Available → Paid only).
2. Every one of these is an atomic conditional transition — attempting an invalid one
   (e.g. approving something already voided) is rejected with a clear error, not a
   silent no-op, and (since this session's polish pass) always surfaces a toast either
   way instead of giving no feedback at all.

### 5.17 Admin edits the delivery/COD fees

The standard delivery fee, free-delivery threshold, and COD handling fee were static
constants at launch. They're now a single admin-editable row, changed here.

1. Admin opens **Order fees** in `apps/admin`, sees the current three values pre-filled,
   edits one or more, saves.
2. **API** (`PATCH /api/order-fee-settings`, admin-only): in one transaction, updates the
   singleton `OrderFeeSettings` row and writes an `OrderFeeSettingsHistory` row capturing
   the full before/after snapshot, which admin changed it, and when — nothing about a fee
   change is ever silent or unattributed.
3. The public `GET /api/order-fee-settings` (used by both the cart and checkout) is
   Redis-cached like categories/hero-slides and eagerly refreshed on every successful
   write, so readers never see a stale value after a save.
4. **Effective immediately, not locked in earlier**: `cart.service` and
   `order.service.checkoutOnce` both read the live settings row on every call, not a
   value captured when the cart page first opened. A shopper sitting on an already-open
   cart or checkout page sees the new fee on their next reload; whatever is live at the
   moment checkout is actually submitted is what gets charged — there's no snapshot of
   the "old" fee for a cart that was opened before the change.
5. **Web (checkout)**: the Rs. 50 COD-handling-fee note and the total shown to the buyer
   both come from this same live endpoint now, not a hardcoded constant — they can never
   drift from what's actually charged server-side.
6. **Admin**: the same page lists the full change history underneath the form (paginated,
   newest first) — old values, new values, who, when — as the accountability trail for a
   change that affects every order's total.

---

## 6. Data model (new this session)

`Cart` / `CartItem` · `Order` / `OrderItem` (with inline attribution fields) ·
`PaymentTransaction` (one row per gateway attempt, payment or refund) ·
`RequestIdempotency` · `CommissionTier` · `CreatorCommission` · `CreatorLink` /
`CreatorLinkClick` · extended `ProductSize.stock` · `OrderFeeSettings` (singleton row) /
`OrderFeeSettingsHistory` (append-only audit trail, added post-launch — see §5.17).

## 7. Cross-cutting guarantees

- **Atomicity everywhere money or inventory moves**: stock decrement/restore, link
  consumption, idempotency claims, and every commission status transition all use the
  same pattern — a conditional `UPDATE` whose row count tells you whether it actually
  won, never a read-then-write race window.
- **No DB transaction ever spans an external call** — gateway requests and emails always
  happen before a transaction opens or after it commits, never inside it.
- **The gateway redirect is never trusted** — every payment status is confirmed by our
  own server-to-server call, regardless of what the browser's redirect claims.
- **Self-purchase and expired-window exclusions apply uniformly** across all three
  attribution channels through one shared predicate, not three separately-maintained
  copies of the same rule.

## 8. Known limitations (see §2.2 for the full non-goals list)

The two biggest open items if this were to go further: the actual "browser completes a
real wallet payment" path is verified up to the gateway redirect but hasn't been walked
by a human with real sandbox wallet credentials on Khalti's bank-transfer path
specifically (eSewa and Khalti-wallet have been); and there's no seeded brand-owner
account in dev data, so brand-dashboard flows have only ever been exercised via a
temporary membership created inside a verification script.

## 9. Build history

18 chunks: schema → inventory functions → cart (backend, then UI) → orders
(create/read, attribution) → checkout UI → eSewa payments → order tracking UI →
commission lifecycle sweep → creator earnings UI → admin commission tooling →
creator-links backend → Khalti provider → admin order fulfilment/cancel/refund → brand
dashboard orders → creator share UI + public redirect page → polish (wallet checkout UI
wiring, admin toast feedback, accessibility fixes). Full chunk-by-chunk detail, bugs
found, and verification notes live in the session's persistent memory, not duplicated
here.

Post-launch (same session, after live sandbox testing surfaced the question): order fees
made admin-configurable with an audit trail (§5.17) — previously static constants.
