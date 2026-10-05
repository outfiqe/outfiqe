ALTER TYPE "ContentReportTarget" ADD VALUE 'OUTFIT_BUILD';
ALTER TYPE "ContentReportTarget" ADD VALUE 'OUTFIT_BUILD_COMMENT';

ALTER TABLE "outfits"
    ADD COLUMN "like_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "save_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "comment_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "made_public_at" TIMESTAMP(3),
    ADD COLUMN "removed_at" TIMESTAMP(3),
    ADD CONSTRAINT "outfits_social_counts_not_negative" CHECK ("like_count" >= 0 AND "save_count" >= 0 AND "comment_count" >= 0);

CREATE INDEX "outfits_public_feed_idx" ON "outfits"("made_public_at" DESC, "id" DESC) WHERE "visibility" = 'PUBLIC' AND "removed_at" IS NULL;

CREATE TABLE "outfit_likes" (
    "outfit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_likes_pkey" PRIMARY KEY ("outfit_id","user_id")
);

CREATE INDEX "outfit_likes_user_id_created_at_idx" ON "outfit_likes"("user_id", "created_at");

CREATE TABLE "outfit_saves" (
    "outfit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_saves_pkey" PRIMARY KEY ("outfit_id","user_id")
);

CREATE INDEX "outfit_saves_user_id_created_at_idx" ON "outfit_saves"("user_id", "created_at");

CREATE TABLE "outfit_comments" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_comment_id" UUID,
    "body" TEXT NOT NULL,
    "reply_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_comments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outfit_comments_body_not_blank" CHECK (length(btrim("body")) > 0),
    CONSTRAINT "outfit_comments_reply_count_not_negative" CHECK ("reply_count" >= 0)
);

CREATE INDEX "outfit_comments_outfit_id_created_at_idx" ON "outfit_comments"("outfit_id", "created_at") WHERE "parent_comment_id" IS NULL AND "deleted_at" IS NULL;
CREATE INDEX "outfit_comments_parent_comment_id_created_at_idx" ON "outfit_comments"("parent_comment_id", "created_at");

ALTER TABLE "outfit_likes" ADD CONSTRAINT "outfit_likes_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_likes" ADD CONSTRAINT "outfit_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_saves" ADD CONSTRAINT "outfit_saves_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_saves" ADD CONSTRAINT "outfit_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_comments" ADD CONSTRAINT "outfit_comments_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_comments" ADD CONSTRAINT "outfit_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_comments" ADD CONSTRAINT "outfit_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "outfit_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
