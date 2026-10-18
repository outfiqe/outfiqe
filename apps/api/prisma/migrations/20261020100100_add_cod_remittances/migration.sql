-- AlterTable
ALTER TABLE "tracking_events" ADD COLUMN     "cod_collected_amount" INTEGER;

-- CreateTable
CREATE TABLE "cod_remittances" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "collected_amount" INTEGER NOT NULL,
    "partner_fee_amount" INTEGER NOT NULL,
    "received_amount" INTEGER NOT NULL,
    "note" TEXT,
    "recorded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cod_remittances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cod_remittances_amounts_check" CHECK (
        "collected_amount" >= 0
        AND "partner_fee_amount" >= 0
        AND "partner_fee_amount" <= "collected_amount"
        AND "received_amount" = "collected_amount" - "partner_fee_amount"
    )
);

-- CreateTable
CREATE TABLE "cod_remittance_lines" (
    "id" UUID NOT NULL,
    "remittance_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "collected_amount" INTEGER NOT NULL,
    "partner_fee_amount" INTEGER NOT NULL,

    CONSTRAINT "cod_remittance_lines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "cod_remittance_lines_amounts_check" CHECK (
        "collected_amount" > 0
        AND "partner_fee_amount" >= 0
        AND "partner_fee_amount" <= "collected_amount"
    )
);

-- CreateIndex
CREATE INDEX "cod_remittances_partner_id_received_at_idx" ON "cod_remittances"("partner_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "cod_remittances_partner_id_reference_key" ON "cod_remittances"("partner_id", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "cod_remittance_lines_shipment_id_key" ON "cod_remittance_lines"("shipment_id");

-- CreateIndex
CREATE INDEX "cod_remittance_lines_remittance_id_idx" ON "cod_remittance_lines"("remittance_id");

-- CreateIndex
CREATE INDEX "shipments_delivered_cash_idx" ON "shipments"("delivered_at") WHERE "status" = 'DELIVERED' AND "cod_collected_amount" > 0;

-- AddForeignKey
ALTER TABLE "cod_remittances" ADD CONSTRAINT "cod_remittances_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cod_remittances" ADD CONSTRAINT "cod_remittances_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cod_remittance_lines" ADD CONSTRAINT "cod_remittance_lines_remittance_id_fkey" FOREIGN KEY ("remittance_id") REFERENCES "cod_remittances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cod_remittance_lines" ADD CONSTRAINT "cod_remittance_lines_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
