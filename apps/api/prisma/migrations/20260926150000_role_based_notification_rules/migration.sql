ALTER TYPE "NotificationType" ADD VALUE 'CRM_TICKET_UNASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'CRM_MEMBER_JOINED';
ALTER TYPE "NotificationType" ADD VALUE 'CRM_INVOICE_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'CRM_SUBSCRIPTION_PAST_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'CRM_SUBSCRIPTION_CANCELED';

ALTER TYPE "NotificationEntityType" ADD VALUE 'CRM_SUBSCRIPTION';
ALTER TYPE "NotificationEntityType" ADD VALUE 'CRM_SUBSCRIPTION_INVOICE';

ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;

CREATE UNIQUE INDEX "notifications_recipient_id_dedupe_key_key" ON "notifications"("recipient_id", "dedupe_key");

UPDATE "notifications"
SET "organization_id" = (SELECT "id" FROM "organizations" WHERE "is_platform_org" LIMIT 1)
WHERE "organization_id" IS NULL
  AND "type"::text IN (
    'BRAND_APPLICATION_SUBMITTED',
    'SUPPORT_TICKET_CREATED',
    'SUPPORT_TICKET_ASSIGNED',
    'COUPON_APPROVAL_REQUESTED',
    'COUPON_REDEMPTION_FLAGGED',
    'COUPON_BUDGET_ALERT'
  );
