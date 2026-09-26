ALTER TABLE "notifications" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

UPDATE "notifications"
SET "updated_at" = "created_at"
WHERE "group_key" IS NULL AND "updated_at" <> "created_at";

WITH "platform_notification_permissions" ("notification_type", "permission_key") AS (
  VALUES
    ('BRAND_APPLICATION_SUBMITTED', 'platform:brands:manage'),
    ('SUPPORT_TICKET_CREATED', 'platform:support:respond'),
    ('SUPPORT_TICKET_CREATED', 'platform:support:manage'),
    ('COUPON_APPROVAL_REQUESTED', 'platform:coupons:manage'),
    ('COUPON_REDEMPTION_FLAGGED', 'platform:coupons:manage'),
    ('COUPON_BUDGET_ALERT', 'platform:coupons:manage')
)
DELETE FROM "notifications" AS n
WHERE n."type"::text IN (SELECT "notification_type" FROM "platform_notification_permissions")
  AND NOT EXISTS (
    SELECT 1
    FROM "memberships" AS m
    JOIN "organizations" AS o ON o."id" = m."organization_id" AND o."is_platform_org"
    WHERE m."user_id" = n."recipient_id"
      AND m."status" = 'ACTIVE'
      AND (
        m."is_platform_super_admin"
        OR o."super_admin_membership_id" = m."id"
        OR EXISTS (
          SELECT 1
          FROM "role_permissions" AS rp
          JOIN "platform_notification_permissions" AS p
            ON p."permission_key" = rp."permission_key"
           AND p."notification_type" = n."type"::text
          WHERE rp."role_id" = m."role_id"
        )
      )
  );
