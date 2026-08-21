-- AlterTable
ALTER TABLE "creator_looks" ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "creator_look_views" (
    "id" UUID NOT NULL,
    "creator_look_id" UUID NOT NULL,
    "viewer_id" UUID,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_look_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_look_views_created_at_idx" ON "creator_look_views"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "creator_look_views_creator_look_id_session_id_key" ON "creator_look_views"("creator_look_id", "session_id");

-- AddForeignKey
ALTER TABLE "creator_look_views" ADD CONSTRAINT "creator_look_views_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_views" ADD CONSTRAINT "creator_look_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
