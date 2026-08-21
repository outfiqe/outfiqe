-- CreateEnum
CREATE TYPE "CreatorLeaderboardCategory" AS ENUM ('TOP_XP', 'TOP_CREATOR', 'MOST_LIKES', 'MOST_ENGAGED', 'TOP_SELLER', 'RISING_CREATOR', 'MOST_ACHIEVEMENTS');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hide_from_leaderboards" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "creator_leaderboard_category_configs" (
    "category" "CreatorLeaderboardCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_leaderboard_category_configs_pkey" PRIMARY KEY ("category")
);
