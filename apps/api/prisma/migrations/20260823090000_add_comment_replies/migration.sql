-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMMENT_REPLIED';

-- AlterTable
ALTER TABLE "creator_look_comments" ADD COLUMN     "parent_comment_id" UUID,
ADD COLUMN     "reply_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "creator_look_comments_parent_comment_id_created_at_idx" ON "creator_look_comments"("parent_comment_id", "created_at");

-- AddForeignKey
ALTER TABLE "creator_look_comments" ADD CONSTRAINT "creator_look_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "creator_look_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
