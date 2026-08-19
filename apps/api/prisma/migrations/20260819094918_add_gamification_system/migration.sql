-- CreateEnum
CREATE TYPE "XpActivityType" AS ENUM ('LOOK_CREATED', 'LOOK_LIKE_RECEIVED', 'LOOK_COMMENT_RECEIVED', 'LOOK_COMMENTED', 'LOOK_SAVED', 'USER_FOLLOWED', 'PRODUCT_PURCHASED', 'SALE_GENERATED', 'PRODUCT_TAGGED', 'FOLLOWER_MILESTONE', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "XpTransactionStatus" AS ENUM ('APPLIED', 'REVERSED');

-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('BEGINNER', 'CREATOR', 'COMMUNITY', 'ENGAGEMENT', 'COMMERCE', 'SPECIAL');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "AchievementRequirementType" AS ENUM ('MILESTONE', 'ACTIVITY', 'ENGAGEMENT', 'COMMERCE', 'COMMUNITY', 'LEVEL', 'SPECIAL', 'ADMIN_AWARD');

-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "required_xp" INTEGER NOT NULL,
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_progress" (
    "user_id" UUID NOT NULL,
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "current_level_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_progress_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "xp_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "activity_type" "XpActivityType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "related_entity_id" UUID,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "XpTransactionStatus" NOT NULL DEFAULT 'APPLIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_xp_configs" (
    "activity_type" "XpActivityType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "xp_amount" INTEGER NOT NULL,
    "daily_limit" INTEGER,
    "cooldown_seconds" INTEGER,
    "max_per_entity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_xp_configs_pkey" PRIMARY KEY ("activity_type")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "rarity" "BadgeRarity" NOT NULL,
    "icon" TEXT NOT NULL,
    "design_config" JSONB NOT NULL,
    "xp_reward" INTEGER NOT NULL DEFAULT 0,
    "is_permanent" BOOLEAN NOT NULL DEFAULT true,
    "is_dynamic" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirement_type" "AchievementRequirementType" NOT NULL,
    "requirement_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "badge_id" UUID NOT NULL,
    "awarded_by_id" UUID,
    "award_reason" TEXT,
    "is_displayed" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "removed_at" TIMESTAMP(3),
    "removed_reason" TEXT,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "levels_level_key" ON "levels"("level");

-- CreateIndex
CREATE INDEX "levels_is_active_required_xp_idx" ON "levels"("is_active", "required_xp");

-- CreateIndex
CREATE INDEX "user_progress_total_xp_idx" ON "user_progress"("total_xp");

-- CreateIndex
CREATE INDEX "xp_transactions_user_id_created_at_idx" ON "xp_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "xp_transactions_user_id_activity_type_related_entity_id_idx" ON "xp_transactions"("user_id", "activity_type", "related_entity_id");

-- CreateIndex
CREATE INDEX "badges_category_is_active_idx" ON "badges"("category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_badge_id_key" ON "achievements"("badge_id");

-- CreateIndex
CREATE INDEX "achievements_is_active_idx" ON "achievements"("is_active");

-- CreateIndex
CREATE INDEX "user_badges_user_id_is_displayed_idx" ON "user_badges"("user_id", "is_displayed");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_current_level_id_fkey" FOREIGN KEY ("current_level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_transactions" ADD CONSTRAINT "xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_awarded_by_id_fkey" FOREIGN KEY ("awarded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
