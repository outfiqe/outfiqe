-- CreateEnum
CREATE TYPE "DeliveryPartnerConnection" AS ENUM ('API', 'MANUAL');

-- CreateEnum
CREATE TYPE "PartnerBookingStatus" AS ENUM ('REQUESTED', 'BOOKED', 'BOOKING_FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PartnerWebhookVerification" AS ENUM ('SIGNATURE', 'HEADER_TOKEN', 'NOTIFY_THEN_FETCH', 'NONE');

-- CreateEnum
CREATE TYPE "PartnerStatusImportRowOutcome" AS ENUM ('APPLIED', 'NOT_APPLIED', 'DUPLICATE', 'UNMATCHED_REFERENCE', 'UNKNOWN_STATUS', 'INVALID_ROW');

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "label_cod_amount" INTEGER,
ADD COLUMN     "label_printed_at" TIMESTAMP(3),
ADD COLUMN     "packed_by_id" UUID;

-- CreateTable
CREATE TABLE "delivery_partners" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "adapter_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "supports_booking" BOOLEAN NOT NULL DEFAULT false,
    "supports_webhooks" BOOLEAN NOT NULL DEFAULT false,
    "supports_polling" BOOLEAN NOT NULL DEFAULT false,
    "supports_cod" BOOLEAN NOT NULL DEFAULT true,
    "supports_cod_amount_update" BOOLEAN NOT NULL DEFAULT false,
    "supports_cancel" BOOLEAN NOT NULL DEFAULT false,
    "webhook_verification" "PartnerWebhookVerification" NOT NULL DEFAULT 'NONE',
    "reference_pattern" TEXT,
    "cod_remittance_days" INTEGER NOT NULL DEFAULT 7,
    "tracking_url_template" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_partner_accounts" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "merchant_account_ref" TEXT NOT NULL,
    "pickup_point_ref" TEXT,
    "credentials_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_partner_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_partner_zones" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "delivery_zone_id" UUID NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_partner_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_partner_status_maps" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "raw_status" TEXT NOT NULL,
    "canonical_code" "TrackingEventCode" NOT NULL,
    "reason_code" "DeliveryFailureReason",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_partner_status_maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_partner_bookings" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "partner_account_id" UUID NOT NULL,
    "merchant_reference" TEXT NOT NULL,
    "partner_reference" TEXT,
    "status" "PartnerBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "connection" "DeliveryPartnerConnection" NOT NULL,
    "partner_label_url" TEXT,
    "partner_tracking_url" TEXT,
    "partner_fee" INTEGER,
    "failure_reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requested_by_id" UUID,
    "booked_at" TIMESTAMP(3),
    "booked_by_id" UUID,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,

    CONSTRAINT "shipment_partner_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_status_imports" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "uploaded_by_id" UUID,
    "file_name" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "applied_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_status_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_status_import_rows" (
    "id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "partner_reference" TEXT,
    "merchant_reference" TEXT,
    "raw_status" TEXT,
    "outcome" "PartnerStatusImportRowOutcome" NOT NULL,
    "message" TEXT,
    "tracking_event_id" UUID,

    CONSTRAINT "partner_status_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_partners_code_key" ON "delivery_partners"("code");

-- CreateIndex
CREATE INDEX "delivery_partners_country_code_is_active_idx" ON "delivery_partners"("country_code", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_partner_accounts_partner_id_hub_id_key" ON "delivery_partner_accounts"("partner_id", "hub_id");

-- CreateIndex
CREATE INDEX "delivery_partner_zones_hub_id_delivery_zone_id_is_active_idx" ON "delivery_partner_zones"("hub_id", "delivery_zone_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_partner_zones_partner_id_hub_id_delivery_zone_id_key" ON "delivery_partner_zones"("partner_id", "hub_id", "delivery_zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_partner_status_maps_partner_id_raw_status_key" ON "delivery_partner_status_maps"("partner_id", "raw_status");

-- CreateIndex
CREATE INDEX "shipment_partner_bookings_partner_id_status_idx" ON "shipment_partner_bookings"("partner_id", "status");

-- CreateIndex
CREATE INDEX "shipment_partner_bookings_partner_id_merchant_reference_idx" ON "shipment_partner_bookings"("partner_id", "merchant_reference");

-- CreateIndex
CREATE INDEX "shipment_partner_bookings_shipment_id_idx" ON "shipment_partner_bookings"("shipment_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_partner_bookings_partner_id_partner_reference_key" ON "shipment_partner_bookings"("partner_id", "partner_reference");

-- CreateIndex
CREATE INDEX "partner_status_imports_partner_id_created_at_idx" ON "partner_status_imports"("partner_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "partner_status_import_rows_import_id_row_number_key" ON "partner_status_import_rows"("import_id", "row_number");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_packed_by_id_fkey" FOREIGN KEY ("packed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_accounts" ADD CONSTRAINT "delivery_partner_accounts_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_accounts" ADD CONSTRAINT "delivery_partner_accounts_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_zones" ADD CONSTRAINT "delivery_partner_zones_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_zones" ADD CONSTRAINT "delivery_partner_zones_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_zones" ADD CONSTRAINT "delivery_partner_zones_delivery_zone_id_fkey" FOREIGN KEY ("delivery_zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_partner_status_maps" ADD CONSTRAINT "delivery_partner_status_maps_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_partner_account_id_fkey" FOREIGN KEY ("partner_account_id") REFERENCES "delivery_partner_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_booked_by_id_fkey" FOREIGN KEY ("booked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_status_imports" ADD CONSTRAINT "partner_status_imports_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "delivery_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_status_imports" ADD CONSTRAINT "partner_status_imports_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_status_import_rows" ADD CONSTRAINT "partner_status_import_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "partner_status_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;


CREATE UNIQUE INDEX "shipment_partner_bookings_one_live_per_shipment_key" ON "shipment_partner_bookings"("shipment_id") WHERE "status" <> 'CANCELLED';

ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_booked_check" CHECK ("status"::text <> 'BOOKED' OR ("partner_reference" IS NOT NULL AND "booked_at" IS NOT NULL));
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_cancelled_check" CHECK ("status"::text <> 'CANCELLED' OR "cancelled_at" IS NOT NULL);
ALTER TABLE "shipment_partner_bookings" ADD CONSTRAINT "shipment_partner_bookings_partner_fee_check" CHECK ("partner_fee" IS NULL OR "partner_fee" >= 0);

ALTER TABLE "delivery_partner_zones" ADD CONSTRAINT "delivery_partner_zones_priority_check" CHECK ("priority" >= 0);
ALTER TABLE "delivery_partners" ADD CONSTRAINT "delivery_partners_cod_remittance_days_check" CHECK ("cod_remittance_days" >= 0);
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_label_cod_amount_check" CHECK ("label_cod_amount" IS NULL OR "label_cod_amount" >= 0);
ALTER TABLE "partner_status_imports" ADD CONSTRAINT "partner_status_imports_counts_check" CHECK ("row_count" >= 0 AND "applied_count" >= 0 AND "applied_count" <= "row_count");
