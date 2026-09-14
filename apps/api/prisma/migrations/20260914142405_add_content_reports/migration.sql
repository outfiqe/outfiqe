-- CreateEnum
CREATE TYPE "ContentReportTarget" AS ENUM ('CREATOR_LOOK', 'CREATOR_LOOK_COMMENT');

-- CreateEnum
CREATE TYPE "ContentReportReason" AS ENUM ('SPAM', 'HARASSMENT_OR_BULLYING', 'HATE_SPEECH', 'NUDITY_OR_SEXUAL_CONTENT', 'VIOLENCE_OR_DANGEROUS_ACTS', 'SCAM_OR_MISLEADING', 'INTELLECTUAL_PROPERTY', 'OTHER');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "content_flag_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "content_reports" (
    "id" UUID NOT NULL,
    "target_type" "ContentReportTarget" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason" "ContentReportReason" NOT NULL,
    "note" TEXT,
    "reported_by_id" UUID,
    "reporter_ip_hash" TEXT,
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_reports_status_created_at_idx" ON "content_reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "content_reports_target_type_target_id_idx" ON "content_reports"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
