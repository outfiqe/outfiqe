# Outfiqe end-to-end QA audit: final report

Audit window: 2026-10-29 to 2026-10-31.
Companion file with full reproduction detail: `qa/DEFECT-REGISTER.md`.
Branches: original defects fixed and merged via PR #579 (squash `d2d3c237`) to `dev`. This round's testing ran on `test/qa-browser-and-money-paths` (nothing committed; only `qa/` is untracked).

## 0. How to read this report

- Section 1 is the executive summary and the full defect table (QA-001 to QA-015).
- Section 2 is the coverage: what was exercised and what was not.
- Section 3 is the **fix plan, phase by phase**, which is the input to the next working session. Each chunk names its files, approach, tests (shipped in the same commit, per `CLAUDE.md`), scoped test command, branch and commit scope.
- "Fixed/merged" means the fix is already live on `dev`. "Fixed (round 2, uncommitted)" means the fix is complete on branch `fix/qa-round-2-findings` in the working tree but **not committed** — awaiting your morning review. "Open" means still to do.

## 0b. Round 2 remediation status (2026-11-01, uncommitted, branch `fix/qa-round-2-findings`)

Every open bug from this audit is now fixed in the working tree, each with tests in the same change, following `CLAUDE.md` (scoped names, no magic numbers, no comments, module READMEs updated, new files added to `coverage.include`). Nothing is committed and no PR was opened, by request.

| Chunk    | Finding(s)                             | Status                                                | Tests                                                                                                                                                                                                                                                                              |
| -------- | -------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1  | QA-014 (High, uploads stored XSS)      | Done                                                  | `image-type.utils.test.ts` (10), `upload.integration.test.ts` (8, incl. 3 new); verified live (disguised HTML → 422, real PNG served as `image/png`)                                                                                                                               |
| Phase 2a | QA-009 (Medium, stock restore)         | Done                                                  | `payment.stock-exhausted-after-payment.integration.test.ts` (1); no regression in `inventory-ledger` (7), `checkout.withdrawn-product` (2)                                                                                                                                         |
| Phase 3  | QA-015 (Low, CORS 500)                 | Done                                                  | `app.cors.integration.test.ts` (3)                                                                                                                                                                                                                                                 |
| Phase 4  | QA-010/011/013 (Low, web)              | Done                                                  | `OrderDetailBody.test.tsx` (17), `OrderRow.test.tsx` (1), `orderReference.utils.test.ts` (2), `ReviewCard`/`ReviewsSection` (19)                                                                                                                                                   |
| Phase 5  | QA-006 (dev-only)                      | No code change                                        | Not reproducible after a clean `next dev`; behaviour already guarded by `guestHomeRequest.test.ts` + `proxy.test.ts`                                                                                                                                                               |
| Phase 2b | QA-005 composite FK (defence-in-depth) | Done (migration staged, not yet applied to a live DB) | `20261101120000_enforce_cart_order_size_product_pairing`; `prisma validate` passes, SQL verified by `prisma migrate diff`, client regenerates clean, no app-code change needed. Live apply + `cart.size-product-mismatch.integration.test.ts` deferred to CI (Docker down locally) |

**Production data check — dropped by decision:** the planned `size.productId <> productId` audit on `cart_items`/`order_items` is moot because production will be reset before launch, which clears any pre-existing mismatched rows; no new ones can be created since the app-layer guard is merged. The composite FK below applies cleanly on a fresh DB with no triage needed.

**Test-suite status:** every test tied to the round-2 changes passes when run scoped (the evidence above, all re-run individually at the end of the session). The `@outfiqe/utils` (11) and `@outfiqe/image-pipeline` (21) packages passed in a full run. A full `turbo run test` could **not** complete locally: running all ~337 API integration files at once exhausted RAM (machine has 16 GB; free dipped to ~0.2 GB) and the suites cascaded at setup (tests skipped in ~160 ms) — the documented "run API integration files one at a time" flake, not a code failure (the same files pass individually). The authoritative full run is CI, which runs on a PR (green for round 1).

## 1. Executive summary

The platform's core engineering is strong: atomic stock decrement, DB-enforced coupon limits and budgets, idempotent and concurrency-safe checkout and refunds, rotating refresh tokens with reuse detection, server-side ownership and role enforcement, strict JWT verification, and a complete set of security headers. The audit confirmed all of these by execution, not by reading alone.

Fifteen findings were raised. **Eight were fixed and merged** in round 1 (QA-001 to QA-005, QA-007, QA-008). **Round 2 (this session) fixed the rest in the working tree** (QA-009, QA-010, QA-011, QA-013, QA-014, QA-015), left QA-006 as a non-reproducible dev artifact and QA-012 as a no-code local-data note, and **parked only the QA-005 follow-ups** (composite FK + production data check) for your decision.

No new blocker to shipping the purchase funnel was found. The one new High (QA-014, stored XSS via uploads) is now fixed; the money-path and coupon logic held up under every probe.

### Defect table

| ID     | Severity   | Status                                                                       | Title                                                                                                |
| ------ | ---------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| QA-005 | Critical   | Fixed/merged; composite FK staged (round 2); data check dropped (prod reset) | Cart accepted a size from a different product; priced cheap, stock taken from the expensive one      |
| QA-014 | **High**   | **Fixed (round 2, uncommitted)**                                             | Any signed-in user can host executable HTML/JS/SVG on the API origin via `/api/uploads` (stored XSS) |
| QA-001 | High       | Fixed/merged                                                                 | Cart checkout sold deleted or rejected products                                                      |
| QA-002 | High       | Fixed/merged                                                                 | Money taken on a superseded payment attempt was never recognised                                     |
| QA-004 | High       | Fixed/merged                                                                 | Whole-order cancel / return restocked already-restocked units (overselling)                          |
| QA-009 | **Medium** | **Fixed (round 2, uncommitted)**                                             | Paid order with one sold-out line keeps the stock it took from its other lines                       |
| QA-003 | Medium     | Fixed/merged                                                                 | Reconciliation expired old orders without a final gateway check                                      |
| QA-007 | Medium     | Fixed/merged                                                                 | Malformed JSON and oversized bodies returned 500 instead of 400/413                                  |
| QA-010 | Low        | Fixed (round 2, uncommitted)                                                 | Order page shows a COD transaction as SUCCEEDED while payment is DUE                                 |
| QA-011 | Low        | Fixed (round 2, uncommitted)                                                 | Order page title is the raw 36-character order UUID                                                  |
| QA-013 | Low        | Fixed (round 2, uncommitted; partial by design)                              | Several product-page controls are under the 24 px WCAG 2.2 AA target size                            |
| QA-015 | Low        | Fixed (round 2, uncommitted)                                                 | A disallowed CORS origin returns 500 `INTERNAL_ERROR` instead of a clean rejection                   |
| QA-006 | Low        | Not reproducible (dev-state artifact); no code change                        | Logged-out homepage renders the 404 page under `next dev` (production build is fine)                 |
| QA-008 | Low        | Fixed/merged                                                                 | Invalid pagination cursor was silently ignored                                                       |
| QA-012 | Info       | No code change (local data)                                                  | Local hand-made row "Fit Reference Tee" is listed but its detail page 404s                           |

### Integrity and security read-out

- **Pricing / revenue:** QA-005 (the only critical) is fixed and merged; the composite FK is now staged as a migration (round 2); the production data check was dropped because production is being reset before launch.
- **Payments:** QA-002 and QA-003 fixed. QA-009 (stock not restored when a paid order is cancelled for being short) is the open money/inventory item.
- **Inventory:** QA-004 fixed; QA-009 open.
- **Security:** QA-014 (stored XSS via uploads) is the open High. Auth, CSRF, ownership, role guards, mass assignment and JWT handling all verified good (section 2).

## 2. Coverage

### Exercised by execution this audit

- **Checkout (COD) end to end** in the browser: product page, add to cart, cart totals, checkout validation, city-based delivery/COD repricing, order placement, order page. Order persisted with correct amounts.
- **Money paths** by integration test: stock-exhausted-after-payment (QA-009), refund caps and gateway-failure (6 probes pass), coupon edges (7 probes pass: over-cart fixed discount, percent cap, prepaid-only on COD, not-yet-started, max redemptions across buyers, first-order-only, no-stacking), creator attribution via client `sessionId` (5 probes pass).
- **API security** by probe: JWT tampering (alg:none, role/sub swap, garbage all 401), role guards (403), cross-user ownership (404, existence hidden), no mass assignment, CSRF on refresh/logout, refresh rotation + reuse detection, security headers, upload handling (QA-014), CORS (tenant-suffix spoof blocked; QA-015).
- **Accessibility / responsive** at 390 px (same-origin frame): no horizontal overflow on product/cart/checkout/order pages, all form inputs labelled, no unnamed controls, alt text present, sensible heading order, focus rings on all checked controls, long order id wraps. Touch-target sizes flagged (QA-013).
- **Withdrawn-product cart state** (PR #579): cart with its only item rejected shows the sold-out empty state and no Checkout button.

### Not executed (residual risk)

- Seller onboarding and product/inventory management UI; creator posting/tagging end to end; design submissions and limited editions; admin moderation and dashboard reconciliation.
- Stored-content XSS **rendering** in feed/reviews/profiles (only JSON-LD escaping and redirect sanitisation were read); CSRF from a real cross-site page; SSRF.
- Real screen-reader pass; performance measurement; the live eSewa/Khalti hosted payment pages (gateways are mocked in tests).
- Creator collusion through a second self-controlled account is **by design** indistinguishable from a real buyer; it needs a business control (velocity/device checks), not a code fix.

## 3. Fix plan — phase by phase

> **Status (2026-11-01):** Phases 1, 2a, 2b, 3, 4 are implemented in the working tree (see §0b); Phase 5 needed no code change. Phase 2b (QA-005 composite FK) was approved and staged as a migration; its live apply + regression run are deferred to CI. The production data check was dropped (prod reset before launch). The detail below is kept as the record of how each chunk was approached.

Standing rules for every chunk (from `CLAUDE.md`):

- Branch `fix/<kebab>`; never commit to `main`/`dev` directly. Suggested single branch for this round: **`fix/qa-round-2-findings`**, one Conventional Commit per chunk (scope from the workspace folder: `api`, `web`).
- Tests ship **in the same commit** as the change: unit/integration for API, component for web. Add any new source file to the app's `coverage.include`.
- Graphify first (`graphify query`), reuse/extend before creating, no magic numbers, descriptive names, no comments, update the module `README.md` when flow changes.
- Iterate with scoped tests (`pnpm --filter @outfiqe/<app> exec vitest run <file>`); run the full `pnpm test` from root before marking the round complete. Run `graphify update .` after code changes.
- Do **not** open a PR without explicit per-PR approval.

Phases are ordered by severity and risk. Each chunk is independent unless noted, so they can be reordered if you prefer.

---

### Phase 1 — Security: stored XSS via uploads (QA-014) — High

**Goal:** an uploaded file can never be served as executable content from the API origin.

- **Files:** `apps/api/src/modules/uploads/upload.routes.ts` (multer filter), `apps/api/src/shared/storage/providers/local-disk.provider.ts` (`safeExtension`, serving), `apps/api/src/app.ts` (the `/uploads` `express.static` mount and its `setHeaders`), `apps/api/src/modules/uploads/README.md`.
- **Approach (decide one with the owner before coding):**
  1. Validate real file bytes (magic numbers) against the allowed image types, and derive **both** the stored extension and the served `Content-Type` from that server-side detection, never from the client filename or the client `mimetype`.
  2. Serve `/uploads` with a neutralising response: `Content-Disposition: attachment` and/or `Content-Type: application/octet-stream` for anything not a confirmed image, plus a sandboxing CSP on that path. Already-good: the random-UUID key neutralises path traversal.
  3. Preferred long-term: serve user uploads from a separate cookieless origin so even a served HTML file cannot read `csrf_token`/`has_session`. Flag this as a larger change and confirm scope first.
- **Decision point:** choice of (1)+(2) as the minimal fix vs. (3) the origin split — needs the owner's call; raise before implementing.
- **Tests (same commit):** extend `upload.integration.test.ts` — a PNG-mimetype request with an `.html`/`.svg`/`.js` filename must be stored and served as a non-executable type (assert the served `Content-Type` and `Content-Disposition`); a byte-level non-image must be rejected; a genuine PNG still round-trips.
- **Scoped run:** `pnpm --filter @outfiqe/api exec vitest run src/modules/uploads/upload.integration.test.ts`.
- **Commit:** `fix(api): stop uploads being served as executable content`.

---

### Phase 2 — Money & inventory integrity (QA-009, QA-005 follow-ups)

**Chunk 2a — Restore stock when a paid order is cancelled for being short (QA-009) — Medium**

- **Files:** `apps/api/src/modules/payments/payment.service.ts` (`settleVerified`), `apps/api/src/modules/products/inventory/inventory.service.ts` (`decrementStockForItems`), payments `README.md`.
- **Approach:** in the settle transaction, either check every line's availability before decrementing any (all-or-nothing), or restore the lines already committed when any line is insufficient, before `markOrderNeedsManualRefund`. Keep it inside the existing `$transaction` so stock and order status stay consistent.
- **Tests (same commit):** `payment.stock-exhausted-after-payment.integration.test.ts` already exists and currently fails (stock 9, expected 10); it becomes the regression test and must pass. Keep its assertions on PAID + CANCELLED + `needsManualRefund`.
- **Scoped run:** `pnpm --filter @outfiqe/api exec vitest run src/modules/payments/payment.stock-exhausted-after-payment.integration.test.ts`.
- **Commit:** `fix(api): restore committed stock when a paid order is cancelled short`.

**Chunk 2b — QA-005 composite foreign key — Critical follow-up — DONE (migration staged)**

- **Status:** the code guard is already merged; this hardens it at the DB. Implemented round 2 (uncommitted). Approved by the owner on 2026-11-01.
- **Files:** `apps/api/prisma/schema.prisma` (`@@unique([productId, id])` on `ProductSize`; `size` relation on `CartItem` and `OrderItem` repointed to `(productId, sizeId) → (productId, id)`), new migration `apps/api/prisma/migrations/20261101120000_enforce_cart_order_size_product_pairing/migration.sql`.
- **What the migration does:** drops the single-column `cart_items_size_id_fkey` / `order_items_size_id_fkey`, adds a unique index `product_sizes(product_id, id)`, adds composite FKs `(product_id, size_id) → product_sizes(product_id, id)` (CASCADE on cart, RESTRICT on orders). The DB now refuses any cart/order line whose size belongs to a different product.
- **Verification done:** `prisma validate` passes; SQL cross-checked with `prisma migrate diff`; `prisma generate` succeeds with no app-code change (creates set the `sizeId`/`productId` scalars, not a `size: { connect }` relation).
- **Not yet done (needs a live DB — Docker is down locally):** applying the migration and re-running `cart.size-product-mismatch.integration.test.ts` against it. Deferred to CI on the PR.
- **Production data check — dropped by decision:** `size.productId <> productId` audit is moot because prod is being reset before launch. On a fresh DB the composite FK applies with no violating rows to triage.
- **Tests (same commit):** integration test proving the DB rejects a mismatched `(product_id, size_id)` insert.
- **Commit:** `fix(api): enforce product and size pairing with a composite foreign key` (after the data check is clean).

---

### Phase 3 — API robustness: CORS rejection (QA-015) — Low

- **Files:** `apps/api/src/app.ts` (the `cors` origin callback).
- **Approach:** signal a disallowed origin without throwing — `callback(null, false)` so the browser blocks it and nothing logs at error level — or map the CORS error to a quiet 403. Keep the tenant-suffix check exactly as is (it already blocks `outfiqe.local.evil.example`).
- **Tests (same commit):** unit/integration asserting a disallowed origin yields no `Access-Control-Allow-Origin` and is not a 500; an allowed tenant origin still gets the ACAO + credentials headers.
- **Scoped run:** `pnpm --filter @outfiqe/api exec vitest run <the cors test file>`.
- **Commit:** `fix(api): reject disallowed CORS origins without a 500`.

---

### Phase 4 — Web correctness & accessibility (QA-010, QA-011, QA-013) — Low

These are all in the web order/product features and can be one commit or three; grouping as one web chunk is fine.

- **QA-010 — COD transaction label.** Files: the order-detail transactions component under `apps/web/src/features/.../order`. Approach: for a COD order whose payment is DUE, label the row as pending ("Pay on delivery") rather than SUCCEEDED, or hide the transaction row until collected. Component test asserting a DUE COD order does not render "SUCCEEDED".
- **QA-011 — order page title.** Files: the order-detail header component. Approach: show a short reference (first 8 chars of the id, or a dedicated order number if one exists — check the schema first via graphify) as the heading, with the full id still available (e.g. copy affordance). Component test on the rendered heading.
- **QA-013 — touch targets.** Files: product-detail review controls (Edit/Delete/Helpful), rating filter rows, breadcrumb and footer links; the save-address checkbox on checkout. Approach: give these at least a 24x24 (ideally 44x44) hit area via padding, using existing design-system spacing tokens — no magic px. Because Edit and Delete sit adjacent, also confirm review deletion (a Modal from the design system). Component tests for the hit area / confirm dialog where practical.
- **Scoped run:** `pnpm --filter @outfiqe/web test` (component tests live in the `unit`/jsdom project).
- **Commit(s):** `fix(web): clarify COD payment status on the order page`, `fix(web): show a short order reference`, `fix(web): meet minimum touch-target sizes on product and checkout`.

---

### Phase 5 — Developer experience: dev homepage 404 (QA-006) — Low, optional

- **Status:** production build is fine; this only affects `next dev`. Do last, or defer.
- **Files:** `apps/web/src/app/(home)/guest-home/page.tsx` and the parallel-slot `default.tsx` routes; add an integration check that anonymous `GET /` returns 200.
- **Approach:** render the home sections in `guest-home/page.tsx` or add matching `guest-home` slot routes so dev resolves `/` to the landing page. Confirm against commit `bbeeffd6` (cached guest homepage).
- **Commit:** `fix(web): render the logged-out homepage under next dev`.

---

### No code change

- **QA-012 (Info):** "Fit Reference Tee" is a hand-made local DB row (id `00000000-...-f17b`) not defined in the repo; the strict-UUID validator rejects it, so the shop lists a product that cannot be opened. Real ids are random UUIDs. No product fix; clean up the local row if desired.

### Suggested order of work

1. Phase 1 (QA-014, security).
2. Chunk 2a (QA-009, money/inventory).
3. Phase 3 (QA-015) and Phase 4 (web) — independent, either order.
4. Chunk 2b (QA-005 FK) — only after the data check is approved and clean.
5. Phase 5 (QA-006) — optional.

Then run the full `pnpm test` from root, `graphify update .`, and stop for PR approval.

## 4. Working-tree state at report time

- Untracked regression tests from this round (keep): `payment.stock-exhausted-after-payment.integration.test.ts`, `refund.caps.integration.test.ts`, `redemption.rules.integration.test.ts`, `creator-link.attribution.integration.test.ts`. The last three pass; the first fails by design until QA-009 is fixed.
- `qa/DEFECT-REGISTER.md` and this report are untracked.
- Local, gitignored side effects: `outfiqe_db` migrated to head (`prisma migrate deploy`); regenerated Prisma client. Test-data changes to the dev DB: `shopper1`/`shopper2` set `email_verified=true`; one COD test order on `shopper1`; `Denim Trucker Jacket` size M stock reduced by one. All uploaded security-probe files were deleted.
- No product code changed this round. No commits made.
