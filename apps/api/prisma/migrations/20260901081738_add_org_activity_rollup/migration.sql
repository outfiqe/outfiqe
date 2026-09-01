-- CreateTable
CREATE TABLE "org_activity_rollups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "contact_count" INTEGER NOT NULL,
    "deal_count" INTEGER NOT NULL,
    "ticket_count" INTEGER NOT NULL,
    "activity_count" INTEGER NOT NULL,
    "active_member_count" INTEGER NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_activity_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_activity_rollups_day_idx" ON "org_activity_rollups"("day");

-- CreateIndex
CREATE UNIQUE INDEX "org_activity_rollups_organization_id_day_key" ON "org_activity_rollups"("organization_id", "day");

-- AddForeignKey
ALTER TABLE "org_activity_rollups" ADD CONSTRAINT "org_activity_rollups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
