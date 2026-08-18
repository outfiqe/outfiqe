-- CreateTable
CREATE TABLE "creator_look_trend_metrics" (
    "id" UUID NOT NULL,
    "creator_look_id" UUID NOT NULL,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "tag_clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_look_trend_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "creator_look_trend_metrics_bucket_start_idx" ON "creator_look_trend_metrics"("bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "creator_look_trend_metrics_creator_look_id_bucket_start_key" ON "creator_look_trend_metrics"("creator_look_id", "bucket_start");

-- AddForeignKey
ALTER TABLE "creator_look_trend_metrics" ADD CONSTRAINT "creator_look_trend_metrics_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
