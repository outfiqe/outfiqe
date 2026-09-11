-- CreateIndex
CREATE INDEX "brand_payouts_status_created_at_idx" ON "brand_payouts"("status", "created_at");

-- CreateIndex
CREATE INDEX "creator_commissions_status_created_at_idx" ON "creator_commissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "orders_payment_method_created_at_idx" ON "orders"("payment_method", "created_at");
