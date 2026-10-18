-- CreateEnum
CREATE TYPE "ParcelReturnOutcome" AS ENUM ('CUSTOMER_REFUSED_OR_UNREACHABLE', 'WRONG_OR_DAMAGED_ITEM', 'PARTNER_DAMAGED_OR_LOST');

-- CreateEnum
CREATE TYPE "PartnerClaimStatus" AS ENUM ('OPEN', 'RECOVERED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "BrandIncidentKind" AS ENUM ('UNAVAILABLE_ITEM', 'FAILED_INSPECTION', 'WASTED_VISIT', 'MISSED_ROUND');

-- CreateEnum
CREATE TYPE "BrandReturnSource" AS ENUM ('PARCEL_RETURNED', 'FAILED_INSPECTION');

-- CreateEnum
CREATE TYPE "BrandReturnStatus" AS ENUM ('AT_HUB', 'ON_ROUND', 'DROPPED_OFF', 'CONFIRMED');

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "partner_claim_amount" INTEGER,
ADD COLUMN     "partner_claim_status" "PartnerClaimStatus",
ADD COLUMN     "return_checked_in_at" TIMESTAMP(3),
ADD COLUMN     "return_checked_in_by_id" UUID,
ADD COLUMN     "return_outcome" "ParcelReturnOutcome";

-- AlterTable
ALTER TABLE "rider_task_stops" ADD COLUMN     "brand_return_id" UUID;

-- CreateTable
CREATE TABLE "customer_delivery_refusals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "phone_e164" TEXT,
    "order_id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "refused_at" TIMESTAMP(3) NOT NULL,
    "cleared_at" TIMESTAMP(3),
    "cleared_by_id" UUID,
    "clear_reason" TEXT,

    CONSTRAINT "customer_delivery_refusals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_fulfilment_incidents" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "kind" "BrandIncidentKind" NOT NULL,
    "source_key" TEXT NOT NULL,
    "order_id" UUID,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_fulfilment_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_returns" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "fulfilment_group_id" UUID NOT NULL,
    "shipment_id" UUID,
    "source" "BrandReturnSource" NOT NULL,
    "status" "BrandReturnStatus" NOT NULL DEFAULT 'AT_HUB',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dropped_off_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_id" UUID,
    "is_auto_confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "brand_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_return_lines" (
    "id" UUID NOT NULL,
    "brand_return_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "resellable_qty" INTEGER NOT NULL,
    "damaged_qty" INTEGER NOT NULL,

    CONSTRAINT "brand_return_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_delivery_refusals_shipment_id_key" ON "customer_delivery_refusals"("shipment_id");

-- CreateIndex
CREATE INDEX "customer_delivery_refusals_user_id_refused_at_idx" ON "customer_delivery_refusals"("user_id", "refused_at");

-- CreateIndex
CREATE INDEX "customer_delivery_refusals_phone_e164_refused_at_idx" ON "customer_delivery_refusals"("phone_e164", "refused_at");

-- CreateIndex
CREATE INDEX "brand_fulfilment_incidents_brand_id_occurred_at_idx" ON "brand_fulfilment_incidents"("brand_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "brand_fulfilment_incidents_kind_source_key_key" ON "brand_fulfilment_incidents"("kind", "source_key");

-- CreateIndex
CREATE INDEX "brand_returns_brand_id_status_idx" ON "brand_returns"("brand_id", "status");

-- CreateIndex
CREATE INDEX "brand_returns_hub_id_status_idx" ON "brand_returns"("hub_id", "status");

-- CreateIndex
CREATE INDEX "brand_returns_status_dropped_off_at_idx" ON "brand_returns"("status", "dropped_off_at");

-- CreateIndex
CREATE UNIQUE INDEX "brand_returns_fulfilment_group_id_source_key" ON "brand_returns"("fulfilment_group_id", "source");

-- CreateIndex
CREATE UNIQUE INDEX "brand_return_lines_brand_return_id_order_item_id_key" ON "brand_return_lines"("brand_return_id", "order_item_id");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_return_checked_in_by_id_fkey" FOREIGN KEY ("return_checked_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_task_stops" ADD CONSTRAINT "rider_task_stops_brand_return_id_fkey" FOREIGN KEY ("brand_return_id") REFERENCES "brand_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_refusals" ADD CONSTRAINT "customer_delivery_refusals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_refusals" ADD CONSTRAINT "customer_delivery_refusals_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_refusals" ADD CONSTRAINT "customer_delivery_refusals_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_delivery_refusals" ADD CONSTRAINT "customer_delivery_refusals_cleared_by_id_fkey" FOREIGN KEY ("cleared_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_fulfilment_incidents" ADD CONSTRAINT "brand_fulfilment_incidents_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_returns" ADD CONSTRAINT "brand_returns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_returns" ADD CONSTRAINT "brand_returns_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_returns" ADD CONSTRAINT "brand_returns_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_returns" ADD CONSTRAINT "brand_returns_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_returns" ADD CONSTRAINT "brand_returns_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_return_lines" ADD CONSTRAINT "brand_return_lines_brand_return_id_fkey" FOREIGN KEY ("brand_return_id") REFERENCES "brand_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_return_lines" ADD CONSTRAINT "brand_return_lines_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;



ALTER TABLE "brand_return_lines" ADD CONSTRAINT "brand_return_lines_quantities_check" CHECK ("resellable_qty" >= 0 AND "damaged_qty" >= 0 AND "resellable_qty" + "damaged_qty" > 0);
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_partner_claim_amount_check" CHECK ("partner_claim_amount" IS NULL OR "partner_claim_amount" >= 0);
ALTER TABLE "customer_delivery_refusals" ADD CONSTRAINT "customer_delivery_refusals_clearing_check" CHECK (("cleared_at" IS NULL) = ("clear_reason" IS NULL));
