-- Give any non-platform organization that never got a trial window a fresh 14-day trial.
UPDATE "organizations"
SET "trial_ends_at" = NOW() + INTERVAL '14 days'
WHERE "trial_ends_at" IS NULL
  AND "is_platform_org" = false
  AND "id" NOT IN (SELECT "organization_id" FROM "subscriptions");
