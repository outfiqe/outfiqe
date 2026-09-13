-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('EVERYONE', 'CUSTOMERS', 'APPROVED_CREATORS', 'BRAND_OWNERS', 'STAFF');

-- CreateEnum
CREATE TYPE "AnnouncementStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'CANCELED');

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target_surface" "NotificationSurface",
    "target_path" TEXT,
    "expires_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "status" "AnnouncementStatus" NOT NULL DEFAULT 'DRAFT',
    "recipient_count" INTEGER,
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_audience_targets" (
    "id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "audience" "AnnouncementAudience" NOT NULL,

    CONSTRAINT "announcement_audience_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_status_scheduled_at_idx" ON "announcements"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "announcements_created_by_admin_id_idx" ON "announcements"("created_by_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_audience_targets_announcement_id_audience_key" ON "announcement_audience_targets"("announcement_id", "audience");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_audience_targets" ADD CONSTRAINT "announcement_audience_targets_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
