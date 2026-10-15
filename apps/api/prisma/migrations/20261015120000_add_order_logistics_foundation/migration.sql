◇ injected env (42) from .env.local // tip: ◈ secrets for agents [www.dotenvx.com]
-- CreateEnum
CREATE TYPE "FulfilmentMode" AS ENUM ('BRAND_SHIPS', 'OUTFIQE_LOGISTICS');

-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('AWAITING_BRAND', 'READY_FOR_PICKUP', 'PICKED_UP', 'AT_HUB', 'IN_PARCEL', 'CANCELLED', 'RETURN_AT_HUB', 'RETURNING_TO_BRAND', 'RETURNED_TO_BRAND');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PACKED', 'HANDED_TO_PARTNER', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED', 'RETURNING', 'RETURNED_TO_HUB', 'CANCELLED', 'LOST');

-- CreateEnum
CREATE TYPE "ItemInspectionStatus" AS ENUM ('NOT_INSPECTED', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrackingEventSource" AS ENUM ('BRAND', 'RIDER', 'HUB', 'PARTNER_WEBHOOK', 'PARTNER_POLL', 'PARTNER_IMPORT', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TrackingEventCode" AS ENUM ('AWAITING_BRAND', 'READY_FOR_PICKUP', 'PICKED_UP', 'AT_HUB', 'IN_PARCEL', 'RETURN_AT_HUB', 'RETURNING_TO_BRAND', 'RETURNED_TO_BRAND', 'PACKED', 'HANDED_TO_PARTNER', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'DELIVERED', 'RETURNING', 'RETURNED_TO_HUB', 'LOST', 'CANCELLED', 'ROUND_ASSIGNED', 'RIDER_ASSIGNED', 'BAG_TAGGED', 'VISIT_WASTED', 'COUNT_MISMATCH', 'INSPECTION_RECORDED', 'BOOKING_REQUESTED', 'BOOKING_CONFIRMED', 'BOOKING_FAILED', 'COD_AMOUNT_CHANGED', 'DELIVERY_RESCHEDULED', 'UNKNOWN_PARTNER_STATUS', 'HANDOVER_NOT_SCANNED', 'DELIVERY_DISPUTED', 'NOTE');

-- CreateEnum
CREATE TYPE "DeliveryFailureReason" AS ENUM ('CUSTOMER_UNREACHABLE', 'CUSTOMER_REFUSED', 'WRONG_ADDRESS', 'RESCHEDULED_BY_CUSTOMER', 'WRONG_OR_DAMAGED_ITEM', 'PARTNER_ISSUE', 'OTHER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "country_code" CHAR(2) NOT NULL DEFAULT 'NP',
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'NPR',
ADD COLUMN     "phone_e164" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "promised_delivery_by" DATE,
ADD COLUMN     "promised_delivery_from" DATE,
ADD COLUMN     "refunded_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "order_fulfilment_groups" ADD COLUMN     "at_hub_at" TIMESTAMP(3),
ADD COLUMN     "fulfilment_mode" "FulfilmentMode" NOT NULL DEFAULT 'BRAND_SHIPS',
ADD COLUMN     "hub_id" UUID,
ADD COLUMN     "picked_up_at" TIMESTAMP(3),
ADD COLUMN     "pickup_code" TEXT,
ADD COLUMN     "pickup_location_id" UUID,
ADD COLUMN     "pickup_status" "PickupStatus",
ADD COLUMN     "pickup_status_changed_at" TIMESTAMP(3),
ADD COLUMN     "ready_for_pickup_at" TIMESTAMP(3),
ADD COLUMN     "shipment_id" UUID;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "failed_qty" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inspection_status" "ItemInspectionStatus" NOT NULL DEFAULT 'NOT_INSPECTED',
ADD COLUMN     "refunded_qty" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "hubs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "time_zone" TEXT NOT NULL,
    "working_days" INTEGER[],
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "pickup_round_times" TEXT[],
    "ready_cutoff_minutes" INTEGER NOT NULL,
    "partner_collection_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hub_pickup_zones" (
    "id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "delivery_zone_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hub_pickup_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_pickup_locations" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone_e164" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "landmark" TEXT,
    "city" TEXT NOT NULL,
    "city_normalized" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "opening_note" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_pickup_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "tracking_code" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PACKED',
    "status_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" CHAR(3) NOT NULL,
    "cod_amount_to_collect" INTEGER NOT NULL,
    "cod_collected_amount" INTEGER,
    "weight_grams" INTEGER NOT NULL,
    "parcel_count" INTEGER NOT NULL,
    "delivery_attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_event_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "fulfilment_group_id" UUID,
    "shipment_id" UUID,
    "code" "TrackingEventCode" NOT NULL,
    "source" "TrackingEventSource" NOT NULL,
    "actor_user_id" UUID,
    "partner_id" UUID,
    "raw_status" TEXT,
    "raw_payload" JSONB,
    "reason_code" "DeliveryFailureReason",
    "location" TEXT,
    "note" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_to_status" BOOLEAN NOT NULL DEFAULT false,
    "is_correction" BOOLEAN NOT NULL DEFAULT false,
    "dedupe_key" TEXT NOT NULL,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hub_pickup_zones_delivery_zone_id_idx" ON "hub_pickup_zones"("delivery_zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "hub_pickup_zones_hub_id_delivery_zone_id_key" ON "hub_pickup_zones"("hub_id", "delivery_zone_id");

-- CreateIndex
CREATE INDEX "brand_pickup_locations_brand_id_is_active_idx" ON "brand_pickup_locations"("brand_id", "is_active");

-- CreateIndex
CREATE INDEX "brand_pickup_locations_city_normalized_idx" ON "brand_pickup_locations"("city_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_code_key" ON "shipments"("tracking_code");

-- CreateIndex
CREATE INDEX "shipments_status_last_event_at_idx" ON "shipments"("status", "last_event_at");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_hub_id_status_idx" ON "shipments"("hub_id", "status");

-- CreateIndex
CREATE INDEX "tracking_events_fulfilment_group_id_occurred_at_idx" ON "tracking_events"("fulfilment_group_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tracking_events_shipment_id_occurred_at_idx" ON "tracking_events"("shipment_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_events_source_dedupe_key_key" ON "tracking_events"("source", "dedupe_key");

-- CreateIndex
CREATE UNIQUE INDEX "order_fulfilment_groups_pickup_code_key" ON "order_fulfilment_groups"("pickup_code");

-- CreateIndex
CREATE INDEX "order_fulfilment_groups_shipment_id_idx" ON "order_fulfilment_groups"("shipment_id");

-- CreateIndex
CREATE INDEX "order_fulfilment_groups_hub_id_pickup_status_idx" ON "order_fulfilment_groups"("hub_id", "pickup_status");

-- AddForeignKey
ALTER TABLE "order_fulfilment_groups" ADD CONSTRAINT "order_fulfilment_groups_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fulfilment_groups" ADD CONSTRAINT "order_fulfilment_groups_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "brand_pickup_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fulfilment_groups" ADD CONSTRAINT "order_fulfilment_groups_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_pickup_zones" ADD CONSTRAINT "hub_pickup_zones_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hub_pickup_zones" ADD CONSTRAINT "hub_pickup_zones_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_pickup_locations" ADD CONSTRAINT "brand_pickup_locations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddCheckConstraint
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_amount_within_total_check" CHECK ("refunded_amount" >= 0 AND "refunded_amount" <= "total");

-- AddCheckConstraint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_refunded_qty_within_qty_check" CHECK ("refunded_qty" >= 0 AND "refunded_qty" <= "qty");

-- AddCheckConstraint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_failed_qty_within_qty_check" CHECK ("failed_qty" >= 0 AND "failed_qty" <= "qty");

-- AddCheckConstraint
ALTER TABLE "order_fulfilment_groups" ADD CONSTRAINT "order_fulfilment_groups_pickup_status_matches_mode_check" CHECK (("fulfilment_mode" = 'OUTFIQE_LOGISTICS') = ("pickup_status" IS NOT NULL));

-- AddCheckConstraint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_amounts_not_negative_check" CHECK ("cod_amount_to_collect" >= 0 AND ("cod_collected_amount" IS NULL OR "cod_collected_amount" >= 0) AND "delivery_attempt_count" >= 0);

-- AddCheckConstraint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_parcel_size_positive_check" CHECK ("weight_grams" > 0 AND "parcel_count" > 0);

-- AddCheckConstraint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_one_subject_check" CHECK (num_nonnulls("fulfilment_group_id", "shipment_id") = 1);

-- AddCheckConstraint
ALTER TABLE "hubs" ADD CONSTRAINT "hubs_ready_cutoff_minutes_not_negative_check" CHECK ("ready_cutoff_minutes" >= 0);

-- CreatePartialUniqueIndex
CREATE UNIQUE INDEX "brand_pickup_locations_one_active_default_per_brand_key" ON "brand_pickup_locations"("brand_id") WHERE "is_default" = true AND "is_active" = true;

-- BackfillInternationalPhone
UPDATE "orders" SET "phone_e164" = '+977' || "phone" WHERE "phone_e164" IS NULL AND "phone" ~ '^98[0-9]{8}$';
