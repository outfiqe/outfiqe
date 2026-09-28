ALTER TABLE "notifications" ADD COLUMN "organization_id" UUID;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "notifications_recipient_id_organization_id_updated_at_idx"
  ON "notifications"("recipient_id", "organization_id", "updated_at");

UPDATE "notifications" AS n
SET "organization_id" = o."id"
FROM "organizations" AS o
WHERE n."metadata"->>'crmOrganizationSubdomain' = o."subdomain";
