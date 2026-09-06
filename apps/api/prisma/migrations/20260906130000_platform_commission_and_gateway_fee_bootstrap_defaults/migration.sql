ALTER TABLE "platform_commission_rules" ALTER COLUMN "updated_by_id" DROP NOT NULL;

ALTER TABLE "gateway_fee_rates" ALTER COLUMN "updated_by_id" DROP NOT NULL;

CREATE UNIQUE INDEX "gateway_fee_rates_payment_method_active_key" ON "gateway_fee_rates"("payment_method") WHERE "is_active" = true;

WITH bootstrap_rule AS (
  INSERT INTO "platform_commission_rules" ("id", "is_active", "updated_by_id", "created_at", "updated_at")
  SELECT gen_random_uuid(), true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  WHERE NOT EXISTS (
    SELECT 1 FROM "platform_commission_rules" WHERE "is_active" = true
  )
  RETURNING "id"
)
INSERT INTO "platform_commission_tiers" (
  "id", "rule_id", "min_price", "max_price", "fee_type",
  "flat_amount", "rate_percent_basis_points", "sort_order"
)
SELECT
  gen_random_uuid(),
  bootstrap_rule."id",
  tier."min_price",
  tier."max_price",
  tier."fee_type"::"PlatformFeeType",
  tier."flat_amount",
  tier."rate_percent_basis_points",
  tier."sort_order"
FROM bootstrap_rule
CROSS JOIN (VALUES
  (0, 1000, 'FLAT', 30, NULL::integer, 0),
  (1000, 2000, 'PERCENT', NULL::integer, 500, 1),
  (2000, 3000, 'PERCENT', NULL::integer, 400, 2),
  (3000, 5000, 'PERCENT', NULL::integer, 350, 3),
  (5000, NULL::integer, 'PERCENT', NULL::integer, 300, 4)
) AS tier ("min_price", "max_price", "fee_type", "flat_amount", "rate_percent_basis_points", "sort_order");

INSERT INTO "gateway_fee_rates" (
  "id", "payment_method", "rate_percent_basis_points", "is_active",
  "updated_by_id", "created_at", "updated_at"
)
VALUES
  (gen_random_uuid(), 'ESEWA', 200, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'KHALTI', 200, true, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("payment_method") WHERE "is_active" = true DO NOTHING;
