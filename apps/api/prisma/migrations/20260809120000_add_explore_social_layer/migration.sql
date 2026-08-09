-- CreateEnum
CREATE TYPE "CreatorLookTagClickSource" AS ENUM ('FEED', 'PRODUCT_PAGE');

-- AlterTable
ALTER TABLE "creator_looks" ADD COLUMN     "comment_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "save_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
-- "handle" is added nullable first so existing rows can be backfilled with a
-- generated slug before the NOT NULL + unique constraints are applied below.
ALTER TABLE "users" ADD COLUMN     "follower_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "following_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "handle" TEXT;

-- Backfill: slugify the name, then disambiguate collisions with a short
-- suffix derived from the row's own id (stable, no extra random column needed).
UPDATE "users"
SET "handle" = lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '', 'g'), '^$', 'user'))
  || substring(replace("id"::text, '-', '') from 1 for 6);

ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;

-- CreateTable
CREATE TABLE "creator_look_likes" (
    "creator_look_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_look_likes_pkey" PRIMARY KEY ("creator_look_id","user_id")
);

-- CreateTable
CREATE TABLE "creator_look_saves" (
    "creator_look_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_look_saves_pkey" PRIMARY KEY ("creator_look_id","user_id")
);

-- CreateTable
CREATE TABLE "creator_look_comments" (
    "id" UUID NOT NULL,
    "creator_look_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_look_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_look_hashtags" (
    "creator_look_id" UUID NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "creator_look_hashtags_pkey" PRIMARY KEY ("creator_look_id","tag")
);

-- CreateTable
CREATE TABLE "creator_look_tag_clicks" (
    "id" UUID NOT NULL,
    "creator_look_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" TEXT NOT NULL,
    "source" "CreatorLookTagClickSource" NOT NULL DEFAULT 'FEED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_look_tag_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "following_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","following_id")
);

-- CreateIndex
CREATE INDEX "creator_look_comments_creator_look_id_deleted_at_idx" ON "creator_look_comments"("creator_look_id", "deleted_at");

-- CreateIndex
CREATE INDEX "creator_look_hashtags_tag_idx" ON "creator_look_hashtags"("tag");

-- CreateIndex
CREATE INDEX "follows_following_id_idx" ON "follows"("following_id");

-- CreateIndex
CREATE INDEX "creator_looks_deleted_at_idx" ON "creator_looks"("deleted_at");

-- CreateIndex
CREATE INDEX "creator_looks_created_at_idx" ON "creator_looks"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- AddForeignKey
ALTER TABLE "creator_look_likes" ADD CONSTRAINT "creator_look_likes_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_likes" ADD CONSTRAINT "creator_look_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_saves" ADD CONSTRAINT "creator_look_saves_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_saves" ADD CONSTRAINT "creator_look_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_comments" ADD CONSTRAINT "creator_look_comments_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_comments" ADD CONSTRAINT "creator_look_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_hashtags" ADD CONSTRAINT "creator_look_hashtags_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_tag_clicks" ADD CONSTRAINT "creator_look_tag_clicks_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_tag_clicks" ADD CONSTRAINT "creator_look_tag_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_tag_clicks" ADD CONSTRAINT "creator_look_tag_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
