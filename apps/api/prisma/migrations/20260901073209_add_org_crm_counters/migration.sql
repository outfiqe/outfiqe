-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "activity_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "contact_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deal_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_crm_activity_at" TIMESTAMP(3),
ADD COLUMN     "ticket_count" INTEGER NOT NULL DEFAULT 0;
