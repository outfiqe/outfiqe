-- CreateEnum
CREATE TYPE "LogisticsAlertType" AS ENUM ('BRAND_NOT_READY', 'BRAND_NOT_READY_ESCALATED', 'MISSED_ROUND', 'WAITING_AT_HUB', 'PARTNER_NOT_COLLECTED', 'NO_PARTNER_UPDATE', 'PROMISE_AT_RISK', 'PROMISE_MISSED', 'UNKNOWN_PARTNER_STATUS', 'COUNT_MISMATCH', 'COD_COLLECTED_MISMATCH', 'COD_REMITTANCE_OVERDUE');

-- CreateTable
CREATE TABLE "logistics_alerts" (
    "id" UUID NOT NULL,
    "alert_type" "LogisticsAlertType" NOT NULL,
    "subject_key" TEXT NOT NULL,
    "order_id" UUID,
    "fulfilment_group_id" UUID,
    "shipment_id" UUID,
    "brand_id" UUID,
    "hub_id" UUID,
    "detail" TEXT,
    "raised_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "is_auto_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by_id" UUID,
    "resolution_note" TEXT,

    CONSTRAINT "logistics_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logistics_alerts_resolved_at_raised_at_idx" ON "logistics_alerts"("resolved_at", "raised_at");

-- CreateIndex
CREATE INDEX "logistics_alerts_notified_at_raised_at_idx" ON "logistics_alerts"("notified_at", "raised_at");

-- CreateIndex
CREATE INDEX "logistics_alerts_alert_type_resolved_at_idx" ON "logistics_alerts"("alert_type", "resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "logistics_alerts_alert_type_subject_key_key" ON "logistics_alerts"("alert_type", "subject_key");

-- AddForeignKey
ALTER TABLE "logistics_alerts" ADD CONSTRAINT "logistics_alerts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_alerts" ADD CONSTRAINT "logistics_alerts_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_alerts" ADD CONSTRAINT "logistics_alerts_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_alerts" ADD CONSTRAINT "logistics_alerts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_alerts" ADD CONSTRAINT "logistics_alerts_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_alerts" ADD CONSTRAINT "logistics_alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

