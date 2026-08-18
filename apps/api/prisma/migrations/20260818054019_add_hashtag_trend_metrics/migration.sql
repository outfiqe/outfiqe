-- CreateTable
CREATE TABLE "hashtag_trend_metrics" (
    "id" UUID NOT NULL,
    "tag" TEXT NOT NULL,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hashtag_trend_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hashtag_trend_metrics_bucket_start_idx" ON "hashtag_trend_metrics"("bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "hashtag_trend_metrics_tag_bucket_start_key" ON "hashtag_trend_metrics"("tag", "bucket_start");
