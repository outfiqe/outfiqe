-- AlterTable
ALTER TABLE "shipment_partner_bookings" ADD COLUMN     "booking_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_attempt_at" TIMESTAMP(3),
ADD COLUMN     "last_polled_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "shipment_partner_bookings_status_connection_idx" ON "shipment_partner_bookings"("status", "connection");

-- CreateTable
CREATE TABLE "partner_webhook_receipts" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "raw_body" TEXT NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processing_error" TEXT,
    "event_count" INTEGER NOT NULL DEFAULT 0,
    "applied_count" INTEGER NOT NULL DEFAULT 0,
    "unknown_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "partner_webhook_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_webhook_receipts_partner_id_received_at_idx" ON "partner_webhook_receipts"("partner_id", "received_at");

-- CreateIndex
CREATE INDEX "partner_webhook_receipts_received_at_idx" ON "partner_webhook_receipts"("received_at");

-- AddForeignKey
ALTER TABLE "partner_webhook_receipts" ADD CONSTRAINT "partner_webhook_receipts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "partner_webhook_receipts" ADD CONSTRAINT "partner_webhook_receipts_counts_check" CHECK ("event_count" >= 0 AND "applied_count" >= 0 AND "unknown_count" >= 0 AND "applied_count" <= "event_count" AND "unknown_count" <= "event_count");
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_attempts_check" CHECK ("booking_attempts" >= 0);
