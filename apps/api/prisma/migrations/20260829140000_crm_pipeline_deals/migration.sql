-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_won" BOOLEAN NOT NULL DEFAULT false,
    "is_lost" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "expected_close_date" TIMESTAMP(3),
    "owner_membership_id" UUID,
    "partner_creator_id" UUID NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pipeline_stages_organization_id_sort_order_idx" ON "pipeline_stages"("organization_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_organization_id_name_key" ON "pipeline_stages"("organization_id", "name");

-- CreateIndex
CREATE INDEX "deals_organization_id_stage_id_idx" ON "deals"("organization_id", "stage_id");

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "pipeline_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_membership_id_fkey" FOREIGN KEY ("owner_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_partner_creator_id_fkey" FOREIGN KEY ("partner_creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill a default pipeline for every existing organization
INSERT INTO "pipeline_stages" ("id", "organization_id", "name", "sort_order", "is_won", "is_lost", "created_at", "updated_at")
SELECT gen_random_uuid(), o."id", seed."name", seed."sort_order", seed."is_won", seed."is_lost", NOW(), NOW()
FROM "organizations" o
CROSS JOIN (VALUES
  ('Lead', 0, false, false),
  ('Contacted', 1, false, false),
  ('Negotiating', 2, false, false),
  ('Won', 3, true, false),
  ('Lost', 4, false, true)
) AS seed("name", "sort_order", "is_won", "is_lost");
