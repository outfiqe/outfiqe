-- CreateIndex
CREATE INDEX "creator_links_product_id_idx" ON "creator_links"("product_id");

-- CreateIndex
CREATE INDEX "creator_look_products_product_id_idx" ON "creator_look_products"("product_id");

-- CreateIndex
CREATE INDEX "creator_look_tag_clicks_product_id_idx" ON "creator_look_tag_clicks"("product_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_attributed_creator_id_idx" ON "order_items"("attributed_creator_id");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");
