# Outfiqe Commerce System — Funnel Test Plan

Covers everything built across the cart → checkout → payments → inventory →
creator-commission project (branch `feat/commerce-system`, PR #30): cart, checkout,
COD/eSewa/Khalti payments, orders, creator commissions, creator referral links, admin
moderation, and the brand dashboard. Organized as end-to-end funnels rather than a flat
feature list, since almost every bug found during this build only showed up when a full
journey was walked, not in isolation.

## 1. Test accounts you'll need

| Role                          | How to get one                                                                    | Notes                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Admin                         | Seeded via `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` in `apps/api/.env`  | Logs into `apps/admin`                                                                       |
| Brand owner                   | Apply at `/apply` on the web app → admin approves → invite email → register       | No brand owner exists in seed data — you must create one through the real flow at least once |
| Creator                       | Any signed-up customer → Dashboard → "Apply to become a creator" → admin approves | One-click apply, no form                                                                     |
| Buyer #1 (attribution source) | Plain sign-up                                                                     | Will click a creator's link                                                                  |
| Buyer #2                      | Plain sign-up                                                                     | Used for cross-account isolation checks (cart, orders, brand order scoping)                  |

You'll want **at least two buyer accounts** and **at least one creator + one brand owner**
approved before starting, since several funnels below depend on all of them existing
together (e.g. attribution needs an approved creator, an approved brand's product, and a
buyer who isn't the creator).

**Payment sandbox logins** (both are real, publicly documented test credentials — safe to
use, not secrets):

- **eSewa**: ID `9711111111` (or `...2` / `...3`), password `Nepal@123`, MPIN `1122`, token `123456`.
- **Khalti**: ID `9800000000` (or `...1` through `...5`), MPIN `1111`, OTP `987654`. The
  sandbox secret key is already set in `apps/api/.env` as `KHALTI_SECRET_KEY`.

---

## 2. Funnel: Browse → cart → COD checkout → delivery

The baseline path — no gateway involved, so a good first smoke test before touching wallets.

- [ ] Browse the storefront as a signed-in customer, open a product with stock, add it to the bag in a specific size.
- [ ] Add a **second, different product** (ideally from a **different brand** — needed later for the brand-isolation funnel).
- [ ] Open `/cart`: quantities, sizes, images, and per-item prices match what was added.
- [ ] Increase/decrease quantity with the +/− controls; confirm it clamps at the size's real available stock (can't go above what's in stock) and won't go below 1 without removing the line.
- [ ] Remove one item; confirm the bag total recalculates immediately.
- [ ] Note the subtotal, then check the delivery fee: **free above the free-delivery threshold, the standard fee otherwise** (Rs. 5,000 / Rs. 150 by default — admin-configurable, see funnel 16). Test both sides of that threshold if you can.
- [ ] Go to `/checkout`. Fill address fields; leave one required field empty and confirm inline validation blocks submit.
- [ ] Select **Cash on delivery** — confirm the summary shows the **COD handling fee** (Rs. 50 by default) added to the total.
- [ ] Submit. You should land on `/orders/[orderId]` immediately (no gateway redirect for COD).
- [ ] Re-check the product's stock (admin Products page, or the product page itself) — it should have **decremented immediately**, since COD claims stock at checkout.
- [ ] Refresh the order page — the 4-step tracker (Placed → Packed → Shipped → Delivered) should show **Placed** as the current step, and the current step should be screen-reader-announced (`aria-current="step"` on that dot if you inspect the DOM).
- [ ] Go to `/orders` (the list) — the new order appears with the right item count, thumbnail, and total.
- [ ] Log in as **Buyer #2** and confirm they **cannot** see Buyer #1's order (`/orders/[buyer1-order-id]` should 404/reject, and it must not appear in Buyer #2's `/orders` list).

## 3. Funnel: Wallet checkout — eSewa (real sandbox payment)

This is the one leg that's never been walked end-to-end by a human — everything up to
the gateway redirect has been verified against the live sandbox, but not an actual
completed browser payment. Please run this one carefully.

- [ ] Add an item to the bag, go to checkout, select **eSewa**. Confirm the "eSewa" card is selectable (not "Coming soon" — that was a real gap fixed in the polish pass).
- [ ] Submit. You should be **redirected to eSewa's hosted payment form** (`rc-epay.esewa.com.np`), not stay on our site.
- [ ] Confirm stock was **not yet decremented** at this point (check the product's stock before completing payment) — wallet orders defer the decrement to payment verification, unlike COD.
- [ ] Log into the eSewa test form with the credentials above and **complete the payment**.
- [ ] You should land back on `/payments/esewa/callback?orderId=...` — confirm it briefly shows "Confirming your payment…" then flips to a **success** screen with a link to the order.
- [ ] Open the order — `paymentStatus` should now be **PAID**, `fulfilmentStatus` **Placed**, and the transaction ledger should show a `PAYMENT` / `SUCCEEDED` row.
- [ ] Confirm stock **did** decrement now (after verify, not at checkout).
- [ ] From the eSewa test form, also try **cancelling** the payment instead of completing it (there's usually a cancel/back option). Confirm you land on the same callback page but see a **failed** state with a **"Try again"** button, and that clicking it re-initiates payment for the _same_ order (doesn't create a duplicate order, doesn't lose your cart contents — the PRD's "keep the bag, offer to try again" rule).
- [ ] Confirm the failed attempt left stock untouched.

## 4. Funnel: Wallet checkout — Khalti (real sandbox payment)

Same shape as eSewa, different gateway. This is the first time this leg has been tested
with real credentials end to end.

- [ ] Repeat the eSewa funnel above, but select **Khalti**. You should be redirected to `test-pay.khalti.com`, not a form post.
- [ ] Complete payment with the Khalti sandbox login above.
- [ ] Land back on `/payments/khalti/callback?orderId=...` — same success/failed/still-pending states as eSewa.
- [ ] Verify PAID status, stock decrement timing, and transaction ledger the same way as the eSewa funnel.
- [ ] Try the cancel/failure path the same way, and confirm "Try again" re-initiates correctly.

## 5. Funnel: Checkout race — last unit in stock

Deliberately adversarial — this is exactly the "what if 2 items left and 3 people buy"
scenario the whole atomic-stock design exists for.

- [ ] Get (or set) a product size down to exactly **1 unit** of stock.
- [ ] From two different browser sessions/accounts, add that size to both bags.
- [ ] Submit checkout from both at (as close to) the same time as you can manage.
- [ ] Expect: **exactly one** succeeds, the other gets a clear "sold out" / items-unavailable error — never two orders for the same last unit, and stock never goes negative.
- [ ] Retry the same request twice in a row with the browser's network tab open, same idempotency key (e.g. resubmit a form quickly) — confirm it does **not** create a second order.

## 6. Funnel: Creator — apply, get approved, post

- [ ] As a plain customer, go to the dashboard and click **"Apply to become a creator."** Confirm the dashboard now shows an **"Application under review"** message on Posts/Share/Earnings, not the real content.
- [ ] As admin, go to **Creators**, find the pending applicant, **approve**.
- [ ] Back as that creator, confirm Posts/Share/Earnings now show real content instead of the pending message.
- [ ] Go to **Posts** (`/dashboard/posts`), create a new post: upload 1–6 images, write a caption, tag up to 6 products via the search picker.
- [ ] Confirm the post appears in "Your posts" with the right tagged-product count.
- [ ] As a **different, non-creator account**, browse the storefront/explore feed and confirm the post is publicly visible with its tags.

## 7. Funnel: Creator — share links and attribution

This is the most involved funnel in the whole system — it's what actually earns a
creator money, and it touches session-bridging, single-use consumption, and the
attribution window all at once.

**7a — Internal (one-time) link**

- [ ] As the approved creator, go to **Share** (`/dashboard/share`). Search for a product, select it.
- [ ] Click **"Generate one-time link."** Confirm a success toast appears and a "New link" panel shows a URL shaped like `/r/<long token>`.
- [ ] Confirm it now also appears in "Your links" below, labeled as a one-time link with **0 clicks**.
- [ ] Open the `/r/<token>` URL in an **incognito/private window** (simulating a cold, logged-out visitor). Confirm it briefly shows "Redirecting…" then lands on the product page.
- [ ] Back in the creator's Share page, refresh — the link's click count should now show **1**, and its status should read **consumed**.
- [ ] Open the _same_ `/r/<token>` URL again. Confirm you're **still redirected to the product** (a dead one-time link doesn't error out for the visitor) but the click count in "Your links" does **not** increase a second time.
- [ ] Generate a **second** one-time link for the **same product**. Confirm this succeeds and produces a **different token/URL** than the first (no cap on how many you can generate).

**7b — External (reusable) link + attribution**

- [ ] Click **"Get reusable link"** for a product. Note the URL.
- [ ] Click it again for the **same product** — confirm you get back the **identical URL**, not a new one (get-or-create, not create).
- [ ] Log out (or use a fresh incognito window with no prior session) and open the reusable link. Confirm it redirects to the product page.
- [ ] Click it a **second and third time** from the same incognito window. Confirm the click count in "Your links" increases each time (unlike the one-time link).
- [ ] From that same incognito window, **sign in as Buyer #1** (someone who isn't the creator), then **buy that exact product** (any payment method).
- [ ] After the order completes, check the creator's **Earnings** page — a new commission line should appear for that sale, sourced from the "shared link," with amount matching whichever commission tier covers that product's price.
- [ ] As admin, check **Commissions** → the same commission should appear there too, `PENDING`, tied to that creator and order.
- [ ] Repeat the same purchase, but have the creator **buy their own shared product** — confirm **no commission is created** (self-purchase exclusion).
- [ ] Repeat again, but this time have a PENDING (not-yet-approved) creator's link clicked and purchased through — confirm **no commission is created** (only approved creators earn — this was a real bug found and fixed this session).

**7c — Profile link**

- [ ] Click **"Get my profile link."** Confirm it becomes a persistent link with no specific product, pointing at the creator's public profile page when opened.

## 8. Funnel: Creator earnings visibility

- [ ] With at least one commission created (from funnel 7), open **Earnings**. Confirm the summary tiles (Total / Pending / Available / Paid) sum correctly and match what's shown per-row below.
- [ ] Confirm each earnings row shows the right product, source (tagged post / your link / shared link), status, and amount.
- [ ] As admin, manually **approve** that commission (Commissions page). Refresh the creator's Earnings — it should move from Pending to Available.
- [ ] As admin, **mark it paid**. Confirm it now shows under Paid on the creator's side too.

## 9. Funnel: Brand — apply, get approved, list products, see orders

- [ ] Go to `/apply` (logged out is fine) and submit a brand application.
- [ ] As admin, go to **Brand applications**, find it under the Pending tab, **approve** it. Confirm the applicant receives an invite (or check the admin-visible invite link if email isn't configured) and can register a real brand-owner account.
- [ ] As the new brand owner, go to **Products** (`/dashboard/products`), add a product with images, price, category, and sizes/stock.
- [ ] As admin, go to **Products**, find it pending, **approve** it. Confirm it becomes visible on the public storefront.
- [ ] Have a buyer purchase that product (any payment method, can be combined with a _different_ brand's product in the same cart — this is the case that matters).
- [ ] As that brand owner, go to **Orders** (`/dashboard/orders`). Confirm you see **only your own product's line item** from that order — not the other brand's item, not the buyer's name/address/phone (visibility is deliberately scoped to product/size/qty/price/status only).
- [ ] Log in as the **other brand** involved in that same mixed-cart order and confirm they see **only their own item**, proving isolation both ways.

## 10. Funnel: Admin — moderation queues

- [ ] **Brand applications**: approve one, reject another (with a reason). Confirm status badges and tab filtering (Pending/Approved/Rejected) work.
- [ ] **Products**: approve/reject a pending submission from a brand.
- [ ] **Creators**: approve/reject a pending creator application.
- [ ] For each: confirm the action gives visible feedback (a toast) — silent failure was a real bug found and fixed this session, so specifically try triggering a failure (e.g. approve the same application twice) and confirm you now see an error toast instead of nothing happening.

## 11. Funnel: Admin — commission tiers and lifecycle

- [ ] Go to **Commissions**. Under tiers, add a new price band (min/max price → commission amount). Confirm validation rejects a max price that isn't greater than the min.
- [ ] Edit an existing tier's amount, confirm it saves.
- [ ] Try deleting a tier that has commissions already attached to it — confirm it's **rejected** with a clear message (not a raw error), and that a genuinely unused tier **can** be deleted.
- [ ] In the commissions ledger below, walk a single commission through **Approve → (wait, or set it up already Available) → Mark paid**, confirming the status tabs update it correctly at each step.
- [ ] Try **Void** on a commission and confirm it requires a reason (the prompt), and that a voided commission can't then be approved or marked paid.

## 12. Funnel: Admin — order fulfilment and cancel/refund

- [ ] Open **Orders**, pick a `Placed` order. Click **"Mark as packed"**, then **"Mark as shipped"**, then **"Mark as delivered."** Confirm each step only offers the _next_ status, never lets you skip ahead.
- [ ] After marking **Delivered**, confirm the order can **no longer be cancelled** (button should disappear).
- [ ] Pick a different order still in `Placed`/`Packed`. Click **"Cancel order,"** enter a reason. Confirm:
  - Stock for its items is restored.
  - If it had an attributed commission, that commission is now **Voided**.
  - If it was already paid, a `REFUND` transaction row appears and `paymentStatus` flips to `Refunded`.
  - If it was COD and unpaid (`Due`), no refund transaction is created — just the cancellation.
- [ ] For a **paid Khalti order**, cancel it and confirm the refund is attempted through the **real Khalti refund API** (check the transaction's raw response, or just confirm it doesn't silently mark `needsManualRefund` unless the call genuinely failed).
- [ ] For a **paid eSewa (or COD) order**, cancel it and confirm it's recorded as a manual refund (no gateway call — eSewa has no refund API) and still flips to `Refunded`.
- [ ] Try cancelling the same order twice — second attempt should be rejected, not silently succeed again.

## 13. Funnel: The full loop, start to finish

Worth doing at least once as a single unbroken session, since this is the actual
business the whole system exists to run:

1. Creator generates a shared link for a product.
2. A cold, logged-out visitor clicks it, later signs in, and buys that product with a wallet payment.
3. Order lands as `PAID`, commission lands as `PENDING`, attributed to the right creator.
4. Admin advances the order through Packed → Shipped → **Delivered**.
5. Either wait for the hourly commission-approval sweep to run naturally (commissions
   move `PENDING → AVAILABLE` roughly 7 days after `deliveredAt`, so this isn't
   practical to wait for in a manual test) — **or** ask an engineer to run the sweep
   manually / backdate `deliveredAt` in a test script, and confirm the commission
   correctly flips to **Available** once the window has passed.
6. Admin marks the commission **Paid**.
7. Creator's Earnings page reflects the full lifecycle: Pending → Available → Paid.

## 14. Funnel: Admin — order fee settings and audit trail

- [ ] As admin, go to **Order fees**. Confirm the three fields (standard delivery fee, free delivery threshold, COD handling fee) are pre-filled with the current values (Rs. 150 / Rs. 5,000 / Rs. 50 if nobody has changed them yet).
- [ ] Change the standard delivery fee to a different value and save. Confirm the form shows the new value after saving, and a new row appears at the top of the change history below the form showing your account name, the old value, and the new value.
- [ ] As a shopper, open `/cart` (or reload it if already open) with a subtotal below the free-delivery threshold. Confirm the delivery fee shown matches the **new** value you just set, not the old default.
- [ ] Go to `/checkout`, select Cash on delivery. Confirm the COD handling fee note and the order total both reflect the **new** value.
- [ ] Place that order and confirm the amount actually charged (order total, and the COD fee line in the transaction ledger) matches the new fee — not the old default.
- [ ] Change the free delivery threshold to just above your cart's subtotal and confirm the delivery fee flips to Free on next reload; change it back down and confirm it flips back.
- [ ] Try saving the form with a field cleared/invalid (e.g. a negative number) — confirm it's rejected client-side or by the API, not silently accepted.
- [ ] Log in as a non-admin (or hit `PATCH /api/order-fee-settings` directly without an admin session) and confirm the update is rejected — this must not be editable by anyone but admin.
- [ ] Scroll the change history — if you've made more than a page's worth of changes, confirm **Load more** paginates correctly instead of loading everything at once.
- [ ] Set all three values back to the defaults (150 / 5000 / 50) when you're done, so the rest of this doc's dollar amounts stay accurate for the next person testing.

## 15. Known accepted limitations — please don't file these as bugs

These were deliberate scope decisions, documented in the relevant module READMEs:

- **No partial refunds** — refunds are always full-order.
- **No standalone post-delivery return flow** — only pre-shipment orders can be cancelled; a return after delivery isn't built.
- **Khalti refund body for bank-sourced payments is unverified** — the refund call always sends the buyer's phone number, assuming Khalti ignores it for wallet-sourced payments; untested against a real bank-sourced Khalti transaction.
- **No rate limit on generating share links** — a creator could technically spam one-time link creation; low risk since each is single-use and scoped to their own account.
- **Cross-selling brand visibility**: a brand only ever sees its own line items, never the rest of a mixed-cart order — this is intentional, not a display bug.

## 16. Bugs already found and fixed this session — quick regression check

If you hit any of these again, it's a regression, not a new discovery:

- [ ] Approved-creator gate on attribution (a PENDING/REJECTED creator's links/tags must never earn commission).
- [ ] Wallet checkout not decrementing stock until payment verification (not at checkout).
- [ ] Admin actions (approve/void/mark-paid/cancel/advance) show a toast on failure instead of doing nothing.
- [ ] Share-link buttons show a persistent success toast, not just a flash back to their idle label.
- [ ] Generating a link updates the "Your links" list without a double-flicker.
- [ ] `/checkout` no longer flashes an empty-cart state right before redirecting to eSewa/Khalti.
- [ ] Checkout's Phone and Landmark fields stay aligned with Full name/City in their grid rows.
- [ ] The COD handling fee shown at checkout always matches what admin has configured in Order fees, never a stale hardcoded Rs. 50.
