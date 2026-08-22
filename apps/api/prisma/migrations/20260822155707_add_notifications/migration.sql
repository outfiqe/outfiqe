-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOOK_LIKED', 'LOOK_COMMENTED', 'NEW_FOLLOWER', 'NEW_BRAND_FOLLOWER', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'COMMISSION_EARNED', 'NEW_ORDER', 'ORDER_STATUS_CHANGED', 'BRAND_APPLICATION_SUBMITTED');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('LOOK', 'USER', 'ORDER', 'BRAND_APPLICATION', 'BADGE');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "actor_id" UUID,
    "type" "NotificationType" NOT NULL,
    "entity_type" "NotificationEntityType",
    "entity_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "group_key" TEXT,
    "actor_count" INTEGER NOT NULL DEFAULT 1,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_updated_at_idx" ON "notifications"("recipient_id", "updated_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_type_key" ON "notification_preferences"("user_id", "type");

-- CreateIndex
-- Prisma's schema DSL can't express a partial index. This is the actual
-- mechanism grouping relies on: it guarantees at most one open (unread) row
-- per (recipient, group) regardless of concurrent writers — see
-- notifications/README.md.
CREATE UNIQUE INDEX "notifications_recipient_id_group_key_open_key" ON "notifications"("recipient_id", "group_key") WHERE "is_read" = false AND "group_key" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
