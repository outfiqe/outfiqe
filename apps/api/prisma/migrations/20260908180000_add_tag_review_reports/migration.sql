-- CreateEnum
CREATE TYPE "TagReportSource" AS ENUM ('PUBLIC_REPORT', 'BRAND_COUNTERFEIT_REJECTION');

-- CreateEnum
CREATE TYPE "TagReportReason" AS ENUM ('COUNTERFEIT', 'NOT_GENUINELY_WORN', 'MISLEADING', 'OFFENSIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "TagReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "tag_counterfeit_flag_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tag_review_reports" (
    "id" UUID NOT NULL,
    "creator_look_product_id" UUID NOT NULL,
    "source" "TagReportSource" NOT NULL,
    "reason" "TagReportReason" NOT NULL,
    "note" TEXT,
    "reported_by_id" UUID,
    "reporter_ip_hash" TEXT,
    "status" "TagReportStatus" NOT NULL DEFAULT 'OPEN',
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tag_review_reports_status_created_at_idx" ON "tag_review_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "tag_review_reports_creator_look_product_id_idx" ON "tag_review_reports"("creator_look_product_id");

-- AddForeignKey
ALTER TABLE "tag_review_reports" ADD CONSTRAINT "tag_review_reports_creator_look_product_id_fkey" FOREIGN KEY ("creator_look_product_id") REFERENCES "creator_look_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_review_reports" ADD CONSTRAINT "tag_review_reports_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_review_reports" ADD CONSTRAINT "tag_review_reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
