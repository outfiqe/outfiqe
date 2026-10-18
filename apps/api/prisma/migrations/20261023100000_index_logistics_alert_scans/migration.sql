-- CreateIndex
CREATE INDEX "logistics_alerts_order_id_alert_type_idx" ON "logistics_alerts"("order_id", "alert_type");

-- CreateIndex
CREATE INDEX "logistics_alerts_fulfilment_group_id_alert_type_idx" ON "logistics_alerts"("fulfilment_group_id", "alert_type");

-- CreateIndex
CREATE INDEX "logistics_alerts_shipment_id_alert_type_idx" ON "logistics_alerts"("shipment_id", "alert_type");

-- CreateIndex
CREATE INDEX "orders_delivery_promise_idx" ON "orders"("promised_delivery_by")
WHERE "promised_delivery_by" IS NOT NULL;

-- CreateIndex
CREATE INDEX "order_fulfilment_groups_pickup_waiting_idx" ON "order_fulfilment_groups"("pickup_status", "pickup_status_changed_at")
WHERE "pickup_status" IS NOT NULL;

-- CreateIndex
CREATE INDEX "order_fulfilment_groups_at_hub_idx" ON "order_fulfilment_groups"("at_hub_at")
WHERE "at_hub_at" IS NOT NULL;

-- CreateIndex
CREATE INDEX "rider_task_stops_unscanned_idx" ON "rider_task_stops"("rider_task_id")
WHERE "scanned_at" IS NULL;
