# Brand Tag Review — rollout runbook

The full spec lives in the PRD artifact. This doc is the operational side: how to ship it, how to
turn it on, and what to watch.

## What the feature does, in one line

A creator's product tag only becomes visible / clickable / commissionable once the brand approves
it (or a policy auto-approves) — the post itself always publishes immediately.

## The switch

`TAG_REVIEW_ENABLED` — an API env var (`apps/api/src/config/env.config.ts`, `z.stringbool()`,
**code default `false`**). It is deliberately not a DB-backed / admin-toggle flag: this is a
one-time launch switch, and every alternative adds a read on the busiest write path in the creator
app (posting/editing a look) for a value that changes once.

| flag            | creator posts a tag                               | queues / jobs / reports           |
| --------------- | ------------------------------------------------- | --------------------------------- |
| **off** (today) | goes live immediately                             | plumbing exists, nothing feeds it |
| **on**          | `PENDING` unless the brand's policy auto-approves | active                            |

## Shipping the code (flag stays OFF)

1. `pnpm test` from root, green. Merge latest `dev` into `feat/brand-tag-review`, re-test.
2. Reviewer note: the branch also carries three unrelated fixes that rode along from parallel
   work — `1a8ca7ca` (gateway fee not deducted from brand payout), `dcd980f5` (settlement-ledger
   test robustness), `02a3cc2f` (leaderboard "+999%" label).
3. `feat/brand-tag-review` → `dev` (PR) → `main` (normal release).
4. Deploy: `pnpm install` (regenerates the gitignored Prisma client) → `prisma migrate deploy`.
   Four migrations apply. The first (`20260908150000_add_brand_tag_review`) runs the **grandfather
   backfill**: one `UPDATE` over all of `creator_look_products` setting every existing tag to
   `APPROVED` / `GRANDFATHERED`, and every brand to `TRUSTED_ONLY` + `autoApproveVerifiedBuyers`.
   That's a table-wide update — brief lock proportional to row count; run it in a low-traffic
   window if `creator_look_products` is large.
5. Restart the API. With the flag unset:
   - the `tag-review-sla-sweep` and `tag-review-reminder-digest` jobs run but no-op (no pending
     tags exist)
   - the `tag-reports` event consumer is idle
   - the brand queue is empty; admin gets an (empty) **Tag reviews** metrics page and **Tag
     reports** queue
   - **creators and shoppers see zero change** — this is the safety property
6. Smoke test in prod: post a look, confirm the tag is live immediately; check `/health`.

## Turning it on

1. **Staging soak.** Set `TAG_REVIEW_ENABLED=true` in staging, restart. Walk the flow: post →
   pending → brand approves from the queue → visible; brand rejects as counterfeit → creator
   notified + a row in the admin Tag reports queue + the creator's `tagCounterfeitFlagCount`
   bumps; backdate a pending tag past 7d under `OPEN`/`TRUSTED_ONLY` → the SLA sweep approves it;
   the reminder digest fires for a backlogged brand. Watch the admin Tag reviews metrics page and
   error rates for a few days.
2. **Announce** to brands and creators ~a week ahead (copy below).
3. **Production enable.** Set `TAG_REVIEW_ENABLED=true` in prod env, restart. Because every brand
   defaults to `TRUSTED_ONLY`, established creator–brand relationships keep auto-approving — only
   genuinely new taggers hit `PENDING`.
4. Co-founders can hide the new admin nav items via **Platform → Navigation access** if desired.

## What existing content does when the flag flips

Nothing. Every tag that exists at flip time is already `APPROVED` (grandfather backfill), so the
read filters don't touch it — same feed, same clicks, same commission, same "worn by" count.
Editing an old look's caption/photos keeps its tags `APPROVED` (only newly-added products get
resolved). Only tags created _after_ the flip go through review.

## Watching the funnel (admin → Tag reviews)

- **Brand review latency** (submit → decision) per policy. Target p90 < 48h for engaged brands.
- **Approval-source mix.** High `SLA` share = brands ignoring their queue. High `BRAND` share =
  `TRUSTED_ONLY` isn't recognising enough relationships.
- **Rejection reasons.** A spike in `NOT_OUR_PRODUCT` / `COUNTERFEIT_SUSPECTED` is a
  catalogue-integrity signal, not just a feature metric.
- **Time to first shoppable** (post → first approved tag). The creator-experience cost — watch it
  doesn't balloon.
- **Stuck queue** — pending > 7d under `APPROVAL_REQUIRED` (the one policy with no SLA).
- **Tag reports** — open count + last-30-days volume.

## Rollback

`TAG_REVIEW_ENABLED=false` + restart → today's behaviour instantly.

Caveat: any tag a creator submitted _while it was on_ stays `PENDING` and hidden (the read filter
isn't flag-gated). Keep the "on" window short (staging first, brief prod) to keep this a
non-issue. If fully abandoning the feature, run once:

```sql
UPDATE creator_look_products
SET review_status = 'APPROVED', approval_source = 'GRANDFATHERED'
WHERE review_status <> 'APPROVED';
```

## Changelog

**Added — Brand Tag Review.** Creators can tag any catalogue product in a look; the tag now goes
through the owning brand before it's shown, clicked, or earns commission. Brands get a review
queue and a policy (open to all / trusted creators only / review every tag) plus an auto-approve
toggle for verified on-platform buyers. Idle tags auto-approve after 7 days under the looser
policies. Creators see per-tag status in the post editor and can re-request a declined tag up to
three times. A public "report this tag" path and a counterfeit-escalation queue feed platform
trust & safety. Gated by `TAG_REVIEW_ENABLED` (off by default); existing tags are grandfathered
in as approved. No change to anyone's experience until the flag is turned on.

## Announcement copy

### For creators

> **Tagging a brand's product now goes to that brand first.** When you tag a product in a look,
> your post still goes live right away — but the shopping tag itself shows up once the brand OKs
> it. Brands you've worked with before, or whose products you've bought on Outfiqe, are approved
> automatically. You'll see each tag's status when you edit a post, and if a brand declines a tag
> they'll tell you why — you can fix it and ask again.

### For brands

> **You now control which creator tags attach to your products.** Pick a policy in your dashboard:
> let any creator tag you, trusted creators only, or review every tag yourself. Verified buyers —
> creators who bought the exact item on Outfiqe — can be auto-approved on top of that. New tags
> land in your **Tag reviews** queue; approve, decline with a reason, or "approve & trust" so that
> creator skips the queue next time. Under the looser policies, anything you don't get to within a
> week is approved for you.
