# Outfiqe QA audit: defect register

Branch: `test/qa-end-to-end-audit` (uncommitted by request)
Started: 2026-10-29
Status legend: FIXED (regression test passes) | CONFIRMED (reproduced by an executed test) | SUSPECTED (code reading only) | BLOCKED | NOT TESTED

## Environment notes

- Generated Prisma client was stale (`RiderTaskStatus` undefined) and blocked all API tests. Fixed locally with `pnpm db:generate` (gitignored output).
- Test Postgres and Redis containers (`outfiqe-postgres-test-1`, `outfiqe-redis-test-1`) are up.
- API integration files are run one at a time because of known Docker IO slowness.

## Defects

### QA-001 | High | FIXED (regression test passes) | Cart checkout sells deleted or rejected products

- **Fix applied (branch fix/qa-audit-defects, uncommitted):** Cart rows for products that are not APPROVED or are soft-deleted now fail checkout with ITEMS_UNAVAILABLE (409), and the cart view lists them as unavailable with Checkout disabled in the web cart. Regression: checkout.withdrawn-product.integration.test.ts, cart.withdrawn-product.integration.test.ts, CartSummary.test.tsx.

- **Persona / workflow:** Customer, cart checkout (COD)
- **Prerequisites:** a buyer with a cart item whose product is later soft-deleted (`deletedAt` set) or set to `REJECTED`
- **Steps:** add the product to the cart; mark the product deleted or rejected; `POST /api/orders/checkout` with a COD body and no `buyNow`
- **Expected:** 4xx (`ITEMS_UNAVAILABLE`), order not created, stock unchanged
- **Actual:** `201`, order created, stock decremented
- **Evidence:** `apps/api/src/modules/orders/checkout/checkout.withdrawn-product.integration.test.ts`, 2 of 2 failing ("expected 201 to be greater than or equal to 400")
- **Root cause:** `loadCartLines` (`checkout.lines.ts`) and `cartRepository.listItems` never check product `status` or `deletedAt`. `loadBuyNowLine` does. `getStockBySizeIds` only reads `ProductSize.stock`.
- **Impact:** customers can buy products the platform or brand withdrew, and the brand is obliged to fulfil an order for a product it removed.
- **Recommended minimal fix:** apply the same `APPROVED` and not-deleted guard to cart lines and return `ITEMS_UNAVAILABLE` with the affected size IDs.
- **Regression test:** the test file above (keep it).
- **Not yet checked:** the online-payment path, where stock is committed later at settlement.

### QA-002 | High | FIXED (regression test passes) | Money taken on a superseded payment attempt is never recognised

- **Fix applied (branch fix/qa-audit-defects, uncommitted):** runVerify checks the open attempt plus up to 5 superseded attempts, and settleTransaction accepts a superseded attempt, so a late completion settles the order. Regression: payment.late-settlement.integration.test.ts (3 tests).

- **Persona / workflow:** Customer, online payment (eSewa; Khalti shares the same service code), retry
- **Steps:** start a payment (attempt A, gateway ref set); click retry while the gateway reports A as `PENDING` (unreachable, or inside the 3-minute `NOT_FOUND` grace); the service marks A `FAILED` ("supersededByRetry") and creates B; the buyer then completes the already-open gateway form for A; `POST /api/payments/:orderId/verify`
- **Expected:** the order is settled (`PAID`), or the capture is flagged for manual refund
- **Actual:** the order stays `INITIATED`. `runVerify` only looks at the latest `INITIATED` transaction (B), so A's success is never seen. The buyer is charged and the order later expires.
- **Evidence:** `apps/api/src/modules/payments/payment.late-settlement.integration.test.ts`, test 1 ("Expected PAID, Received INITIATED")
- **Root cause:** `paymentService.initiate` fails a prior attempt that is still `PENDING` instead of only superseding attempts the gateway confirmed as failed. `findPendingTransaction` then ignores it forever.
- **Impact:** double-charge or charge-without-order, with no reconciliation or manual-refund alert.
- **Recommended minimal fix:** supersede a prior attempt only when the gateway confirms `FAILED`. If it is still `PENDING`, return the existing attempt, or keep superseded attempts verifiable by the sweep and verify endpoint so late `COMPLETE` settles the order or raises `needsManualRefund`.
- **Regression test:** the test file above (keep it).

### QA-003 | Medium | FIXED (regression test passes) | Reconciliation expires old orders without a final gateway check

- **Fix applied (branch fix/qa-audit-defects, uncommitted):** The sweep re-verifies overdue orders with the gateway before expiring them; expireUnpaidOrder fails the order and its open attempts together; a gateway error skips the order for the next sweep. Regression: payment.late-settlement.integration.test.ts (2 tests).

- **Persona / workflow:** Customer and ops, payment reconciliation sweep
- **Steps:** an online order is `INITIATED` for over `RECONCILE_EXPIRE_AFTER_MS` (60 min); the gateway reports `COMPLETE`; run `runPaymentReconciliationSweep`
- **Expected:** verify, then settle the order, or flag it for manual refund
- **Actual:** the order is marked `FAILED` and `CANCELLED` and the payment is never checked. The pending transaction row also stays `INITIATED`.
- **Evidence:** `payment.late-settlement.integration.test.ts`, test 2 ("expected 'FAILED' to be 'PAID'")
- **Root cause:** `findOrdersToReconcile` only covers the window `[expireAfter, checkAfter]`. `findOrdersToExpire` then calls `markOrderFailed` with no verify, and does not call `failPendingTransactions`.
- **Impact:** a late-completing payment is lost. The buyer is charged and the order is cancelled.
- **Recommended minimal fix:** verify once more before expiring. Only expire when the gateway returns `FAILED`, or `NOT_FOUND` or `PENDING` past the grace period. Fail the pending transaction in the same step.
- **Regression test:** the test file above (keep it).

### QA-004 | High | FIXED (regression test passes) | Whole-order cancel restocks units that were already restocked by an item cancellation

- **Fix applied (branch fix/qa-audit-defects, uncommitted):** Cancel and return restock qty - refundedQty per item through listUnrefundedStockLines. Regression: both restock-after-line-cancellation integration tests, refund.pricing.test.ts.

- **Persona / workflow:** Customer, order cancellation (partial then full); admin return path has the same pattern
- **Steps:** place a COD order with an item of qty 2; `POST /api/orders/:id/line-cancellations` for 1 unit (restocked, `restockUnits: true`); then `POST /api/orders/:id/cancel`
- **Expected:** stock ends at `before + 2`, one restock per unit ordered
- **Actual:** stock ends at `before + 3`. The line cancellation restocked 1, then the whole-order cancel restored the full ordered qty of 2.
- **Evidence:** `apps/api/src/modules/orders/cancellation/cancellation.restock-after-line-cancellation.integration.test.ts` ("expected 13 to be 12")
- **Root cause:** `orderCancellationService.cancel` restores stock from `order.items` (`findForAdminAction` selects `sizeId` and `qty` only), ignoring `refundedQty`. The refund claim for the remaining units correctly uses `restockUnits: false`, so the over-restore happens in the explicit `restoreStockForItems` call.
- **Impact:** inventory inflates, so the shop can oversell units that don't exist. `inventory_ledger_entries` also drifts from reality.
- **Return path also reproduced:** `orderReturnService.markReturned` calls `restoreStockForItems` with the same full-qty `order.items`. A partly line-cancelled order that is later returned over-restocks the same way ("expected 13 to be 12", `apps/api/src/modules/orders/returns/return.restock-after-line-cancellation.integration.test.ts`).

- **Recommended minimal fix:** select `refundedQty` in `findForAdminAction` and restore `qty - refundedQty` per item, in both cancel and return.
- **Regression tests:** both test files above (keep them).

### QA-005 | Critical | FIXED (regression test passes) | Cart accepts a size from a different product, so a line is priced from the cheap product but stock is taken from the expensive one

- **Fix applied (branch fix/qa-audit-defects, merged):** addItem rejects a size that does not belong to the product (404), addItems skips such lines, and loadCartLines answers ITEMS_UNAVAILABLE for pre-existing bad rows. Regression: cart.size-product-mismatch.integration.test.ts (2 tests).
- **Defence-in-depth (branch fix/qa-round-2-findings, uncommitted, approved 2026-11-01):** composite FK migration 20261101120000_enforce_cart_order_size_product_pairing enforces `(product_id, size_id)` references the owning product's size at the DB level on cart_items and order_items. Validated by prisma validate / migrate diff / generate; live apply + regression deferred to CI. The existing-data check was dropped because production is reset before launch.

- **Persona / workflow:** Customer (or anyone with an account), add to cart then checkout. Price manipulation.
- **Steps:** as a buyer, `POST /api/cart/items` with `productId` of a Rs 100 product and `sizeId` of a Rs 5000 product's size (both are UUIDs that are visible on public product pages); then `POST /api/orders/checkout` (COD, no `buyNow`)
- **Expected:** the add is rejected (400/404) because the size does not belong to the product
- **Actual:** add returns `200`. Checkout returns `201`, and the expensive product's size stock is decremented. The line is priced from `cart_items.product.price` (Rs 100), and the brand, commission and payout are computed from the cheap product's brand.
- **Evidence:** `apps/api/src/modules/cart/cart.size-product-mismatch.integration.test.ts` ("expected true to be false" on `wasUnderpaidSale`)
- **Root cause:** `cartService.addItem` and `addItems` never check the `productId`/`sizeId` pairing. Only the buy-now path (`loadBuyNowLine` via `findSizeIdsForProduct`) does. `cartRepository.upsertItem` writes both IDs as given. Checkout trusts `cartRows[].product.price` and `sizeId` independently.
- **Impact:** a customer can buy any product at any other product's price, and can move stock and revenue between brands. Financial loss, wrong payouts and commissions, corrupted inventory.
- **Recommended minimal fix:** validate the pairing in `addItem`/`addItems` (reuse `productRepository.findSizeIdsForProduct`), and re-validate in `loadCartLines` as defence in depth. Better still, add a composite FK `(product_id, size_id)` so the DB enforces it.
- **Regression test:** the test file above (keep it). Add a data check that finds existing mismatched `cart_items` and orders.
- **Follow-up:** run a production query for existing `cart_items` or `order_items` where `size.productId <> productId`.

### QA-006 | Low | NOT REPRODUCIBLE (dev-state artifact); no code change | Logged-out homepage renders the 404 page in dev

- **Re-checked 2026-11-01 (branch fix/qa-round-2-findings):** after a clean `next dev` start and the dev DB migrated to head, anonymous `GET /` and `GET /guest-home` both return 200 and render the landing page (title "Outfiqe: Nepali fashion, worn by real muses", hero present, no 404 markers). The original 404 matches this file's own note that killing the dev server leaves stale `.next` state; it is not a product defect. No code changed. The anonymous `/` -> guest-home behaviour is already guarded by unit tests `guestHomeRequest.test.ts` and `proxy.test.ts` (cookieless GET/HEAD of `/` serves the cached guest home; a session or taste cookie renders live). No speculative routing change was made.

- **Resolution:** a clean `next build` and `next start` return `200` for anonymous `/`, `/guest-home` and `/` with a cookie, and the HTML contains the hero content (title "Outfiqe: Nepali fashion, worn by real muses", about 380 KB). The production homepage works. The remaining issue is developer experience: anonymous `/` is a 404 under `next dev`, so local dev cannot see the logged-out homepage unless a `refresh_token` cookie is set.
- **Provisional notes below kept for the record.**
- **Side note:** a stale `.next/dev/types/routes.d.ts` broke the first `next build`. It was caused by killing the dev server, not by product code.

- **Persona / workflow:** Anonymous visitor, homepage
- **Steps:** open `/` with no `refresh_token` and no taste cookie in `next dev` (browser: `http://outfiqe.local:3000/`); or `curl http://localhost:3000/guest-home`
- **Expected:** the landing page (header, hero, sections)
- **Actual:** "We can't find that page" (404). `GET /` and `GET /guest-home` both log `404`. The same `/` with any `refresh_token` cookie returns `200`, and `/shop` returns `200`.
- **Evidence:** browser screenshot of the 404 at `/`; web dev log lines `GET /guest-home 404`, `GET / 404`
- **Suspected cause:** commit `bbeeffd6` (perf: cached guest homepage) rewrites anonymous `/` to `apps/web/src/app/(home)/guest-home/page.tsx`, which renders `null` and relies on every parallel slot falling back to `default.tsx`. In dev that route resolves to 404.
- **Impact if it reproduces in production:** every logged-out visitor, which is most of the acquisition traffic, sees a 404 on the homepage.
- **Status:** verifying with `next build` and `next start` (QA-006 is upgraded to Critical if it reproduces, or downgraded to a dev-only Low if it does not).
- **Recommended minimal fix, if confirmed:** render the home sections in `guest-home/page.tsx` or add matching `guest-home` slot routes, and add an integration check that `GET /` returns 200 for an anonymous request.

### QA-007 | Medium | FIXED (regression test passes) | Malformed JSON and oversized bodies return 500 instead of 400 and 413

- **Fix applied (branch fix/qa-audit-defects, uncommitted):** The error handler maps entity.parse.failed to 400 INVALID_JSON and entity.too.large to 413 PAYLOAD_TOO_LARGE, logged at warn. Regression: error-handler.test.ts, product.public-cursor.integration.test.ts.

- **Persona / workflow:** any API client; public endpoints (for example `POST /api/auth/login`)
- **Steps:** `curl -X POST -H "Content-Type: application/json" -d '{bad' http://localhost:4000/api/auth/login`; or post a 2 MB body
- **Expected:** `400` (invalid JSON) and `413` (payload too large), logged at warn level
- **Actual:** `500 {"code":"INTERNAL_ERROR"}` for both. The API log shows `UNHANDLED_ERROR: SyntaxError: Expected property name...` and `UNHANDLED_ERROR: PayloadTooLargeError: request entity too large` at error level.
- **Root cause:** the error handler does not map body-parser errors (`entity.parse.failed`, `entity.too.large`, which carry `status`/`statusCode` 400 and 413) and treats them as unhandled. `express.json()` is mounted with defaults (`app.ts`).
- **Impact:** clients get a misleading server error; any script can fill error monitoring (Sentry) and on-call alerts with fake "unhandled" errors at no cost.
- **Recommended minimal fix:** in the error handler, honour body-parser's `type`/`status` (`entity.parse.failed` returns 400 `INVALID_JSON`; `entity.too.large` returns 413), logging at warn.
- **Regression test:** integration test posting malformed JSON and an oversized body, expecting 400 and 413.

### QA-008 | Low | FIXED (regression test passes) | Invalid pagination cursor is silently ignored

- **Fix applied (branch fix/qa-audit-defects, uncommitted):** GET /api/products validates cursor as a UUID or a decodable opaque cursor (max 512 characters); anything else returns 422. Regression: product.public-cursor.integration.test.ts, pagination.utils.test.ts.

- **Steps:** `GET /api/products?cursor=garbage`
- **Expected:** `422` (other bad query values such as `limit=0` and `limit=-1` return `422 VALIDATION_ERROR`)
- **Actual:** `200` with the first page. A client with a corrupted cursor restarts from page 1 and shows duplicates, and an infinite-scroll loop can repeat forever.
- **Recommended fix:** validate `cursor` (uuid or opaque token) in the product list query schema, as `listOrdersQuerySchema` already does with `z.uuid()`.

### QA-009 | Medium | FIXED (regression test passes) | Paid order with one sold-out line keeps the stock it took from its other lines

- **Fix applied (branch fix/qa-round-2-findings, uncommitted):** decrementStockForItems is now all-or-nothing: if any line is short, the committed lines are restored in the same transaction and no movement is recorded. Regression: payment.stock-exhausted-after-payment.integration.test.ts; no regression in inventory-ledger and checkout.withdrawn-product.

- **Where:** `apps/api/src/modules/payments/payment.service.ts` `settleVerified`, `productService.decrementStockForItems` (`inventory.service.ts`).
- **What happens:** when a payment settles and some size has no stock left, the other sizes are still decremented. The order is then marked `CANCELLED` with `needsManualRefund`, but nothing restores the units already taken.
- **Impact:** every such order permanently removes sellable units from the shop (inventory shrinks, the opposite of QA-004).
- **Evidence:** `payment.stock-exhausted-after-payment.integration.test.ts` fails with stock 9, expected 10 (order status, cancel and manual-refund flag assertions pass).
- **Suggested fix:** in the settle transaction, restore the committed lines when any line is insufficient, or check all lines before decrementing any.

### QA-010 | Low | FIXED (regression test passes) | Order page shows a COD transaction as SUCCEEDED while payment is still DUE

- **Fix applied (branch fix/qa-round-2-findings, uncommitted):** TransactionLedger now labels a COD payment row as "Pay on delivery" while the order is not PAID, instead of the raw SUCCEEDED status. Regression: OrderDetailBody.test.tsx ("labels a cash-on-delivery payment as pending").

- **Where:** `/orders/:id`, TRANSACTIONS section (web order detail).
- **What happens:** a fresh cash-on-delivery order shows "Payment via COD, SUCCEEDED" under TRANSACTIONS, but the payment status above reads DUE and the banner says to keep the cash ready.
- **Impact:** contradictory status can make buyers think they already paid; support tickets.
- **Suggested fix:** label COD transactions as "Pay on delivery" until the rider collects, or hide the transaction row while payment is DUE.

### QA-011 | Low | FIXED (regression test passes) | Order page title is the raw 36-character order UUID

- **Fix applied (branch fix/qa-round-2-findings, uncommitted):** new shared helper formatOrderReference shows #<first 8, upper> on the order detail heading and, for consistency, on the order list rows (OrderRow) which had the same raw-UUID display. Full id stays in the URL. Regression: OrderDetailBody.test.tsx, OrderRow.test.tsx, orderReference.utils.test.ts.

- **Where:** `/orders/:id` heading ("ORDER CB34B663-EF6B-495A-...").
- **Impact:** hard to read, quote to support or match against an email; wraps badly on narrow screens (to be confirmed at mobile width).
- **Suggested fix:** show a short order reference (first 8 characters) as the title.

### QA-012 | Info | Local data only | Seeded row "Fit Reference Tee" is listed but its detail page returns 404

- **Where:** local database row id `00000000-0000-0000-0000-00000000f17b` (not defined in the repo).
- **Why:** the products API validates ids as strict UUIDs and rejects this id (version nibble 0), so the shop lists a product that cannot be opened. Real ids are random UUIDs, so this only affects hand-made rows.

### QA-013 | Low | FIXED (partial, by design) | Several controls on the product page are smaller than the 24 px WCAG 2.2 AA target size

- **Fix applied (branch fix/qa-round-2-findings, uncommitted):** review action buttons (Helpful/Edit/Delete) and the star rating-filter rows now have a >=24 px min target (min-h-6 + padding). Decisions: review deletion already shows a confirm Modal (accidental-delete risk covered); the checkout "Save this address" checkbox is wrapped in a <label> so the whole row is the target (already compliant); breadcrumb and footer links are inline text links, exempt under the WCAG 2.5.8 inline exception, so left unchanged. Covered by existing ReviewCard/ReviewsSection tests.

- **Where:** product page below the fold: review "Helpful" (59x16), "Edit" (21x16) and "Delete" (35x16) buttons side by side, rating filter rows (340x20), breadcrumb links (16 px high), footer Terms/Privacy/Help links (16 px high). Cart and checkout: the "Save this address" checkbox is 16x16.
- **Impact:** easy to mis-tap, and the adjacent Edit and Delete review buttons risk an accidental delete on a phone.
- **Suggested fix:** give these controls at least 24x24 (ideally 44x44) hit areas with padding, and confirm review deletion.

### QA-014 | High | FIXED (regression tests pass) | Any signed-in user can host executable HTML/JS and SVG on the API origin via /api/uploads (stored XSS)

- **Fix applied (branch fix/qa-round-2-findings, uncommitted):** uploads are validated by magic bytes (new #lib/image-type.utils.ts), and the stored extension and served Content-Type come from the detected type, not the client filename/mimetype. Disguised HTML/SVG -> 422; real images served as image/*. Regression: upload.integration.test.ts (3 new cases), image-type.utils.test.ts; verified live (422 + image/png served).

- **Where:** `apps/api/src/modules/uploads/upload.routes.ts` (multer fileFilter), `shared/storage/providers/local-disk.provider.ts` (safeExtension), `app.ts` express.static mount for `/uploads`.
- **What happens:** the upload filter only checks the client-supplied `file.mimetype`, while the stored file keeps the extension taken from the client filename. So a request with header `content-type: image/png` but filename `x.html` (or `x.svg`, `x.js`) passes the filter and is written as `<uuid>.html`. express.static then serves it inline with `Content-Type: text/html` (or `image/svg+xml`, `text/javascript`) and no `Content-Disposition: attachment`. File bytes are never validated (a `.png` containing "this is not a png" is accepted).
- **Confirmed:** uploaded `marker.html` referencing an uploaded `marker.js` executed JavaScript when opened — the browser tab title changed to "SCRIPT-EXECUTED". The served CSP is `default-src none; script-src self`, which permits same-origin uploaded scripts, so CSP does not stop it.
- **Impact:** in production the API runs on the tenant base domain and the `csrf_token` and `has_session` cookies are set with `domain: .outfiqe.local` and are not httpOnly, so script running on the API origin can read `csrf_token` from `document.cookie` and make same-origin, credentialed calls to the API (e.g. rotate tokens, act as the victim). Account-takeover-class stored XSS, reachable by any verified user. Also a phishing/malware hosting vector on a trusted domain.
- **Suggested fix:** derive both the stored extension and the served Content-Type from a server-side allowlist keyed off validated magic bytes (re-encode images through the pipeline), not the client filename or mimetype; serve uploads with `Content-Disposition: attachment` or `Content-Type: application/octet-stream` and a sandboxing CSP; ideally serve user uploads from a separate cookieless origin. The path-traversal filename `../../x.png` is already neutralised (stored as `<uuid>.png`).

### QA-015 | Low | FIXED (regression test passes) | A disallowed CORS origin returns 500 INTERNAL_ERROR instead of a clean rejection

- **Fix applied (branch fix/qa-round-2-findings, uncommitted):** the cors origin callback now returns callback(null, false) for disallowed origins instead of throwing, so no 500 and no error log. Regression: app.cors.integration.test.ts (allowed tenant reflected, disallowed + suffix-spoof get no allow-origin header, no 500).

- **Where:** `apps/api/src/app.ts` cors origin callback — `callback(new Error("Not allowed by CORS"), ...)`.
- **What happens:** a request from a disallowed Origin makes the cors middleware throw, which reaches the error handler as `UNHANDLED_ERROR` / 500 `INTERNAL_ERROR` and is logged at error level. Tenant-suffix spoofing is correctly blocked (`outfiqe.local.evil.example` rejected), so this is robustness/log-noise only, not an access-control hole.
- **Suggested fix:** signal a disallowed origin without throwing (return `callback(null, false)`) so the browser blocks it and the server logs nothing, or map the CORS error to a 403 handled quietly.

### Verified OK (no defect)

- Login lockout: 10 wrong passwords return `401`, then `429` with `Retry-After: 900`.
- Forgot-password: the fourth request returns `429`.
- Unauthenticated `GET /api/orders` and `/api/cart` return `401`.
- Search with SQL-injection and `<script>` strings returns `200` with normal results (no injection effect observed).
- Malformed UUIDs return `422`, unknown UUIDs return `404`; `limit` outside bounds returns `422`.
- Browser, phone width (390 px frame, same origin): product page, cart, checkout and order page have no horizontal overflow; all form inputs are labelled; no unnamed buttons or links; images have alt text; heading order is sensible; focus rings appear on all checked controls; the long order id wraps to two lines.
- Browser, withdrawn product (PR #579): with the only cart item rejected, the cart shows "Everything in your bag sold out" with Start shopping and no Checkout button; the product was restored to APPROVED afterwards.
- Note: a 9 px overflow appears only in a desktop window because the classic scrollbar takes width; it does not occur with overlay scrollbars on phones.
- API security probe (two seeded customers, localhost:4000): JWT tampering all rejected (alg:none, role swap, sub swap, garbage all 401); role guards hold (customer gets 403 on admin refunds, admin coupons, admin return, GET/POST users); cross-user ownership scoped (B reading/cancelling/paying A order, patching A cart line or A address all 404; A cart unchanged); no mass assignment (PATCH /users/me with role/isCreator/xp ignored, stays CUSTOMER); CSRF enforced on /auth/refresh and /auth/logout (missing or wrong x-csrf-token -> 403 CSRF_MISMATCH); refresh-token rotation with reuse detection (reusing a rotated token -> 401 TOKEN_REUSE_DETECTED and the chain is revoked); security headers present (CSP, HSTS preload, nosniff, X-Frame-Options DENY, no x-powered-by).
- SEO JSON-LD (`jsonLd.tsx`) escapes `<` as `\u003c` before dangerouslySetInnerHTML; redirect targets go through `getSafeRedirect` (rejects `//`, backslashes, non-`/` targets) and OAuth start through `sanitizeOAuthRedirectPath` (code reading).
- Production build: homepage, `/shop` (72 seeded products) and console are clean.
- Harness note: a production build served over plain http on `outfiqe.local` loads no assets, because the production CSP upgrades subresources to https. This is not a product defect. Test production builds on `localhost`.

## Coverage ledger

| Area                                                          | Status           | Notes                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout, COD, cart lines                                     | Partially tested | QA-001, QA-005 found; qty limits, price-change-in-cart, buy-now qty cap (no max in `buyNowLineSchema`, stock-limited only) not yet executed                                                                                                                                                                                                                      |
| Checkout, online payment settlement                           | Partially tested | QA-002, QA-003 found; stock-exhausted-after-payment executed: QA-009                                                                                                                                                                                                                                                                                             |
| Cancellation, returns, refunds                                | Partially tested | QA-004 found (cancel and return paths); refund caps executed (6 probes pass: cross-order item, over-quantity, unpaid online order, paid-total cap, cancel after partial refund, gateway throw goes to manual queue)                                                                                                                                              |
| Coupons and discounts                                         | Tested           | 7 edge probes pass (fixed discount above cart, percent cap, prepaid-only on COD, not yet started, max redemptions across buyers, first-order-only, no stacking with brand discount); existing suite covers budget races and expiry                                                                                                                               |
| Creator attribution and commission                            | Tested           | 5 probes pass (click then buy pays once, self-purchase unpaid, expired click unpaid, clicks owned by another user not claimable, session claimed once). Residual risk by design: a second account controlled by the creator is indistinguishable from a real buyer; needs a business-side control (velocity or device checks), not a code fix                    |
| Seller product and inventory                                  | NOT TESTED       |                                                                                                                                                                                                                                                                                                                                                                  |
| Admin operations                                              | NOT TESTED       |                                                                                                                                                                                                                                                                                                                                                                  |
| Browser UI flows                                              | Partially tested | product page, add to cart, cart totals, checkout validation, city-based repricing, COD order placement and order page driven in browser on `outfiqe.local` (QA-010, QA-011). Also done: phone width, focus visibility, labels, withdrawn-product cart state (QA-013). Not yet: real screen reader pass, mixed cart with one withdrawn line, online payment pages |
| Public API validation, rate limits                            | Tested           | QA-007, QA-008; login and forgot-password limits OK                                                                                                                                                                                                                                                                                                              |
| Security: auth, CSRF, ownership, role guards, mass assignment | Tested           | API probe; all hold. See Verified OK                                                                                                                                                                                                                                                                                                                             |
| Security: file upload handling                                | Tested           | QA-014 (stored XSS via uploads) CONFIRMED in browser                                                                                                                                                                                                                                                                                                             |
| Security: CORS                                                | Tested           | tenant-suffix spoof blocked; QA-015 (500 on disallowed origin)                                                                                                                                                                                                                                                                                                   |
| Security: XSS rendering of user content                       | Partially tested | JSON-LD escaping + redirect sanitisation read; stored-content rendering in feed/reviews not driven in browser                                                                                                                                                                                                                                                    |
| Performance, accessibility                                    | Partially tested | accessibility done at phone width (QA-013); performance not measured                                                                                                                                                                                                                                                                                             |
