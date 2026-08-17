-- CreateTable
CREATE TABLE "product_trend_metrics" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "bucket_start" TIMESTAMP(3) NOT NULL,
    "purchase_units" INTEGER NOT NULL DEFAULT 0,
    "cart_adds" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "creator_tags" INTEGER NOT NULL DEFAULT 0,
    "tag_clicks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_trend_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_trend_metrics_bucket_start_idx" ON "product_trend_metrics"("bucket_start");

-- CreateIndex
CREATE UNIQUE INDEX "product_trend_metrics_product_id_bucket_start_key" ON "product_trend_metrics"("product_id", "bucket_start");

-- CreateIndex
CREATE INDEX "cart_items_created_at_idx" ON "cart_items"("created_at");

-- CreateIndex
CREATE INDEX "creator_look_tag_clicks_created_at_idx" ON "creator_look_tag_clicks"("created_at");

-- CreateIndex
CREATE INDEX "saved_products_created_at_idx" ON "saved_products"("created_at");

-- AddForeignKey
ALTER TABLE "product_trend_metrics" ADD CONSTRAINT "product_trend_metrics_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
