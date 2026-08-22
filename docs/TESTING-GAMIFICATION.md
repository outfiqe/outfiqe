# Outfiqe Journey — Gamification Funnel Test Plan

Covers everything built across the gamification project (branch `feat/gamification-system`):
XP, levels, the achievement rule engine, the badge catalog and collection, view tracking,
time-boxed challenges, creator leaderboards, dynamic badges, animated badges, XP
multipliers, creator competitions, brand-sponsored badges, and the admin Badge Design
Studio. Organized as end-to-end funnels rather than a flat feature list, matching
[TESTING-COMMERCE.md](./TESTING-COMMERCE.md)'s format — most bugs found during this build
only showed up when a full journey was walked, not in isolation.

## 1. Test accounts you'll need

| Role             | How to get one                                                                                   | Notes                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Admin            | Seeded via `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` in `apps/api/.env`                 | Logs into `apps/admin`                                                                    |
| Creator          | Seeded demo accounts `creator1@example.com`…`creator5@example.com`, password `demo-password-123` | These are pre-approved and pre-verified — real signups need admin creator approval first  |
| A second creator | Any other seeded creator account                                                                 | Needed for leaderboard-ranking and dynamic-badge funnels, where relative standing matters |
| Brand owner      | Apply at `/apply` → admin approves → invite email → register                                     | Needed only for the brand-sponsored badge funnel                                          |

You'll want **at least two creator accounts** approved and signed in (in two browser
profiles, or two browsers) for most of the real-time and ranking funnels below, since a
lot of this feature is only observable from a second person's point of view (the toast
someone else gets, the rank someone else holds).

---

## 2. Funnel: Earning XP and leveling up

- [ ] As a creator, post a look, like someone else's look, save a look, leave a comment, and follow another creator — check `/dashboard/progress` after each action and confirm the XP bar/total increases by the amount configured in admin's Activity XP config.
- [ ] Confirm the **XP transaction history** on that page lists each of the above with the right activity label and amount, newest first, paginated once you have enough of them.
- [ ] Repeat the **same** action twice in a row fast (e.g. like, unlike, like the same look again) — confirm you don't earn XP twice for what's meant to be a one-time-per-target activity (the anti-abuse dedup).
- [ ] Rack up enough XP to cross a level boundary (check the seeded level ladder in admin first) — confirm the level number/name updates on `/dashboard/progress` and a **level-up toast** fires in real time without a page refresh.
- [ ] Purchase a product as a buyer, and separately have a creator generate a sale (their tagged product gets bought) — confirm both award XP to the right person (buyer XP vs. creator XP are separate activity types).

## 3. Funnel: Unlocking a rule-based achievement

- [ ] Pick a low-threshold seeded achievement (e.g. "Fashion Newbie", first post) and satisfy its condition — confirm the badge appears in `/dashboard/badges` as collected, with an unlock date, and the achievement's XP reward lands in your XP history.
- [ ] Pick a **compound** achievement (an AND across two conditions, or a nested AND/OR/NOT tree if one's seeded) — satisfy only one branch and confirm it does **not** unlock; satisfy the rest and confirm it does.
- [ ] Check a **locked** achievement's card: it should show a live progress bar (current / target) for counter-style metrics, or "currently #N · need top M" text for rank-based metrics (never a progress bar for those — a rank shrinking toward its target would render backwards on a bar).
- [ ] Confirm a `SPECIAL`-category admin-award badge (e.g. "Outfiqe OG") never shows progress and never unlocks on its own — the locked card should read "Awarded by the Outfiqe team."

## 4. Funnel: Badge collection page

- [ ] `/dashboard/badges` — filter by category tabs (Beginner/Creator/Community/Engagement/Commerce/Special) and by Collected/Locked; confirm counts and results match.
- [ ] Toggle **Hide from profile** on a collected badge, then check your own public creator profile — the hidden badge should not appear in the featured row; toggle it back and confirm it can reappear.
- [ ] **Feature** up to the max number of badges (6) — confirm the 7th feature attempt is blocked client-side, and that the featured order you set (drag-reorder if built, otherwise the order you featured them in) matches what shows on your public profile.
- [ ] Hide a badge that's currently featured — confirm it drops out of the featured set instead of showing a hidden badge as "featured."

## 5. Funnel: Title badge

- [ ] Only a badge an admin has marked **title-eligible** should be selectable as your title — confirm attempting to set a non-eligible collected badge as your title is rejected.
- [ ] Set a valid title badge — confirm it shows on your public profile as the title (separate from the featured-badges row).
- [ ] Hide the currently-titled badge (`Hide from profile`) — confirm your title clears automatically rather than showing a hidden badge as your title.
- [ ] Clear your title entirely (`badgeId: null`) — confirm the profile shows no title, not an error.

## 6. Funnel: Real-time unlock/level-up toasts

Do this with **two browser sessions** — one that stays open on any page while the trigger happens elsewhere (admin manual award, or the other person's action causing your unlock).

- [ ] Have an admin manually award you a badge (Manual actions → Award badge, admin app) while your session is open elsewhere in the app — confirm a toast appears within a couple of seconds, without a page refresh, and it includes the badge's XP reward if it has one.
- [ ] Trigger a genuine rule-based unlock (e.g. cross a like-count threshold) while your session is open — confirm the same real-time toast fires from the engine path too, not just the manual-award path.
- [ ] Cross a level boundary while your session is open — confirm the level-up toast fires and names the new level.
- [ ] Sign out, then have an admin award you a badge — confirm nothing errors server-side (an offline user simply doesn't get a toast; it should not throw when no socket is connected for that user).

## 7. Funnel: Post views and view-based achievements

- [ ] View a look you did **not** post (as a signed-in creator, and again as a signed-out visitor) — confirm the look's view count increases exactly once per unique visitor/session, not once per page load/refresh.
- [ ] View your **own** post — confirm your own view does **not** increment the count (self-views are excluded, same as self-likes).
- [ ] Refresh the same look's page repeatedly from the same session — confirm the count does not keep climbing (session-scoped dedup).
- [ ] If you can reach 1,000/10,000 total views on a look (or check via admin/DB for a look that already has), confirm the "1K Views"/"10K Views" badges unlock automatically.

## 8. Funnel: Time-boxed challenges

- [ ] Have an admin create a challenge with a start date in the past and an end date in the future — confirm it shows on the challenges page/tab as **Open now**, with its own promotional name/description/banner (separate from the underlying badge's catalog name).
- [ ] Confirm a challenge whose start date is in the future shows **Starts soon**, and one whose end date has passed shows **Ended** — and that an ended challenge's achievement stops evaluating (no new unlocks) while anyone who already earned it keeps the badge.
- [ ] Satisfy an open challenge's condition(s) and confirm the badge unlocks exactly like any other achievement (collection page, toast, XP reward).

## 9. Funnel: Creator leaderboards

- [ ] Visit `/leaderboard/creators` — confirm all seven category tabs (Top XP, Top Creator, Most Likes, Most Engaged, Top Seller, Rising Creator, Most Achievements) that are currently **enabled** in admin appear, and that a category an admin has **disabled** does not show as a tab at all.
- [ ] Confirm rankings update live (no refresh) shortly after a qualifying action from any creator — e.g. liking a look should eventually move the "Most Likes" board.
- [ ] Toggle **Hide me from leaderboards** on your own creator profile — confirm you drop out of every category on the next recompute, not just the one you were viewing.
- [ ] Confirm the empty-week fallback: a brand-new week with no data yet should show a sensible empty state, not an error or an infinite spinner.

## 10. Funnel: Dynamic badges

- [ ] Have an admin create (or use a seeded) **dynamic** badge tied to a rank condition (e.g. "currently in the top 3 of Top Creator"). Get into that ranking — confirm the badge unlocks.
- [ ] Lose that ranking (get overtaken) and wait for the periodic re-check (or trigger it manually if there's an admin/debug hook) — confirm the badge becomes **hidden from your profile** (`isDisplayed: false`) rather than being deleted from your collection outright; re-qualify and confirm it reappears.
- [ ] Confirm a **non-dynamic** badge is completely unaffected by this re-check — it should never flicker hidden/shown on its own.

## 11. Funnel: Animated, rarity-driven badge visuals

- [ ] Compare a Common/Uncommon badge against a Rare/Epic/Legendary/Exclusive one on the collection grid — the higher rarities should visibly animate (glow/shimmer/pulse/radiant) while Common/Uncommon stay static, matching the rarity ring's own escalation.
- [ ] Confirm a **locked** badge never animates, regardless of what rarity it will be once unlocked (locked badges render as a static grayscale lock icon).
- [ ] If an admin has set an explicit animation override on a badge's design, confirm that override wins over the rarity default in both directions (forcing a normally-animated rarity to stay static with "None," and giving a normally-static rarity an animation).
- [ ] With OS-level "reduce motion" turned on, confirm badge animations are suppressed.

## 12. Funnel: Admin — gamification management

- [ ] **Levels**: create/edit a level (name, required XP, icon); confirm there's no delete, only an `isActive` toggle, and that an inactive level is skipped by level recompute.
- [ ] **Activity XP config**: change an activity's XP amount, daily cap, cooldown, or max-per-entity — perform that activity as a creator and confirm the new values are actually enforced (not just saved).
- [ ] **Badges**: create a rule-based badge (conditions) and an admin-award badge (with an optional assignment limit) — confirm the discriminated form correctly hides/shows the right fields for each mode, and that an admin-award badge with `assignmentLimit: 1` can only ever be awarded to one person total, even under two admins racing to award it at once.
- [ ] **Manual award/removal**: award a badge to a specific user by id with a reason; confirm it shows up in "Manually awarded badges" with that reason, and that **Remove** (with its own reason) takes it away and it no longer shows in that user's collection.
- [ ] **Manual XP adjustment**: grant and dock XP with a reason; confirm the user's total and level recompute correctly, including a negative adjustment that crosses back down a level boundary.
- [ ] **Stats tiles**: confirm total badges awarded, total achievements unlocked (engine), total manual awards, and the most-awarded badge tile all move when you perform the actions above.
- [ ] Confirm every admin mutation here rejects a non-admin session (hit the API directly without an admin token if you want to be thorough) — this whole feature is admin-role-gated, not just UI-hidden.

## 13. Funnel: XP multipliers

- [ ] Create an XP multiplier window that's currently active (`startsAt` in the past, `endsAt` in the future, `isActive: true`) — perform an XP-earning action and confirm the XP actually applied is the base amount **times** the multiplier, not the base amount.
- [ ] Confirm the web app shows a banner/indicator that a multiplier is currently active while you're on the dashboard.
- [ ] Confirm only the **highest** currently-active multiplier applies if you create two overlapping windows (not both stacked, not the wrong one picked).
- [ ] Let a multiplier's window end (or create one already in the past) — confirm XP goes back to the unmultiplied base amount once it's over, and the banner disappears.

## 14. Funnel: Creator competitions (weekly auto-award)

- [ ] Have an admin create a competition tied to a leaderboard category (e.g. "top 3 of Most Likes each week") with its own trophy badge design.
- [ ] Confirm the competition's banner shows on `/leaderboard/creators` for the matching category only, naming the trophy badge and how many people win it — and does **not** show on other categories' tabs.
- [ ] After a week boundary passes (or by directly checking with an admin/DB after the scheduled job runs), confirm the top N creators in that category for the week that just ended were automatically awarded the trophy badge and its XP — and that this doesn't double-award someone who already has it if the job somehow runs twice for the same week.
- [ ] Confirm the XP transaction for a competition win is labeled distinctly (not attributed to "admin"), and that the real-time unlock toast fires for competition wins too.
- [ ] Disable the competition's underlying leaderboard category in admin — confirm settlement for that category is skipped, not crashed.

## 15. Funnel: Brand-sponsored badges

- [ ] Have an admin attach an existing brand to a badge via the "Sponsor brand" search field on the badge form (type to search, select from results).
- [ ] Confirm the sponsor credit ("Sponsored by {brand}", linking to the brand's page) shows on: the badge collection grid, a locked badge's progress card, and the real-time unlock toast text.
- [ ] Confirm the credit clears everywhere once an admin removes the sponsor via the edit form's clear button.
- [ ] Confirm attempting to sponsor with a brand id that doesn't exist is rejected with a clean error, not a raw database error.
- [ ] Confirm a Challenge's or Creator Competition's trophy badge has **no** sponsor-brand option in their own forms (sponsorship is scoped to the main badge catalog only, by design).

## 16. Funnel: Badge Design Studio

- [ ] Open the Design Studio from a badge's create or edit form ("Design Studio" button). Confirm it opens with one default background layer already on the canvas, not blank.
- [ ] Add a background, an icon, and a text layer. Drag each around the canvas and resize it from its corner handles — confirm the on-canvas position/size and the live preview (rendered at real badge size/rarity) update together, live, as you drag.
- [ ] Reorder layers with the up/down arrows in the layer list — confirm stacking order on the canvas changes to match (a layer moved to the top should visually paint over the ones below it).
- [ ] Delete a layer — confirm it disappears from both the canvas and the live preview, and that **Done** is disabled while zero layers remain.
- [ ] Save (**Done**) and submit the badge form — confirm the badge's design in the admin catalog card and, once collected, on the real creator dashboard collection page **exactly matches** what the Studio's live preview showed (this is the core WYSIWYG guarantee — treat any mismatch as a bug).
- [ ] Edit an existing studio-designed badge, click **Use simple design** — confirm it reverts to a plain shape/color picker (losing the layered design) and saves correctly as the simpler shape.
- [ ] Use **Duplicate** on any badge (both a simple-design one and a studio-designed one) — confirm the create form opens pre-filled with "Copy of {name}" and every other field (including all studio layers, if any) copied from the source, ready to submit as a brand-new badge.
- [ ] Confirm a badge created **before** this feature shipped (a plain shape+color design) still renders identically on every surface — collection grid, admin card, toast — nothing about the older, simpler badges should look different after this change.

---

## 17. Known accepted limitations — please don't file these as bugs

These were deliberate scope decisions, documented in the relevant module READMEs:

- **No brand self-service sponsorship request** — only an admin can attach a sponsor to a badge; a brand can't request or manage this themselves yet.
- **No billing/payment tracking for sponsorships** — this system only tracks attribution (who's credited), never a charge or invoice.
- **Sponsorship, and the Design Studio, are scoped to the main badge catalog only** — Challenges and Creator Competitions keep their own simpler shape/color/animation pickers and can't be sponsored or studio-designed yet, even though the underlying data shape would technically allow it.
- **No layer rotation in the Design Studio** — layers can be moved and resized, but not rotated, in this version.
- **No durable notification history** — achievement/level-up moments are ephemeral real-time toasts only; there's no notification center or "mark as read" inbox to check unlocks you missed while offline.
- **No brand campaign requirements based on badges, no reputation score, no advanced creator ranking, no badge-based discovery, no achievement-based discounts** — all explicitly out of scope for this build (Phase 3 of the original PRD).

## 18. Bugs already found and fixed this session — quick regression check

If you hit any of these again, it's a regression, not a new discovery:

- [ ] A dynamic badge's "not currently active" note only ever shows on the exact `isDynamicallyActive === false` case — it must never show for a non-dynamic or not-yet-collected badge (`null`), and must never be skipped via a loose falsy check.
- [ ] Integration tests (and the real dev API) never make a real outbound Gmail call or leak real payment-gateway secrets into a test run — if you ever see a slow test tied up talking to real SMTP, that's this regression again.
- [ ] A creator-competition's `leaderboardCategory` field must never collide with or silently overwrite a badge's own `category` field — they're separate concepts (which leaderboard it ranks by, vs. which catalog category the trophy badge belongs to).
- [ ] Manually awarding a badge (admin) fires the same real-time unlock toast an engine-driven unlock does — it should never award silently.
- [ ] A brand-sponsored badge's unlock toast credits the sponsor by name; a competition-won badge's XP transaction is labeled with the competition as its source, never mislabeled as an admin action.
