-- AlterTable
ALTER TABLE "admin_invites" ADD COLUMN     "role_id" UUID;

UPDATE "admin_invites"
SET "role_id" = (
  SELECT "roles"."id"
  FROM "roles"
  JOIN "organizations" ON "organizations"."id" = "roles"."organization_id"
  WHERE "organizations"."is_platform_org" = true
    AND "roles"."name" = 'Admin'
  LIMIT 1
)
WHERE "role_id" IS NULL;

-- AlterTable
ALTER TABLE "admin_invites" ALTER COLUMN     "role_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "admin_invites_role_id_idx" ON "admin_invites"("role_id");

-- AddForeignKey
ALTER TABLE "admin_invites" ADD CONSTRAINT "admin_invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
