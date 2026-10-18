-- CreateEnum
CREATE TYPE "RiderEmploymentType" AS ENUM ('EMPLOYEE', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "IdentityDocumentType" AS ENUM ('CITIZENSHIP', 'DRIVING_LICENCE', 'PASSPORT', 'NATIONAL_ID');

-- CreateEnum
CREATE TYPE "RiderTaskStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'WASTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiderStopDirection" AS ENUM ('COLLECT', 'RETURN');


-- CreateTable
CREATE TABLE "rider_invites" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hub_id" UUID NOT NULL,
    "employment_type" "RiderEmploymentType" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "invited_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "riders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "employment_type" "RiderEmploymentType" NOT NULL,
    "status" "RiderStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "vehicle_type" TEXT,
    "vehicle_number" TEXT,
    "identity_document_type" "IdentityDocumentType",
    "identity_document_last4" TEXT,
    "identity_verified_at" TIMESTAMP(3),
    "identity_verified_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_tasks" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "pickup_location_id" UUID NOT NULL,
    "round_starts_at" TIMESTAMP(3) NOT NULL,
    "status" "RiderTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_by_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "wasted_reason" TEXT,

    CONSTRAINT "rider_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_task_stops" (
    "id" UUID NOT NULL,
    "rider_task_id" UUID NOT NULL,
    "fulfilment_group_id" UUID NOT NULL,
    "direction" "RiderStopDirection" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scanned_at" TIMESTAMP(3),

    CONSTRAINT "rider_task_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_tag_batches" (
    "id" UUID NOT NULL,
    "hub_id" UUID NOT NULL,
    "tag_count" INTEGER NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bag_tag_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bag_tags" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "batch_id" UUID NOT NULL,
    "fulfilment_group_id" UUID,
    "attached_at" TIMESTAMP(3),
    "attached_by_rider_id" UUID,

    CONSTRAINT "bag_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rider_invites_token_hash_key" ON "rider_invites"("token_hash");

-- CreateIndex
CREATE INDEX "rider_invites_email_idx" ON "rider_invites"("email");

-- CreateIndex
CREATE UNIQUE INDEX "riders_user_id_key" ON "riders"("user_id");

-- CreateIndex
CREATE INDEX "riders_hub_id_status_idx" ON "riders"("hub_id", "status");

-- CreateIndex
CREATE INDEX "rider_tasks_rider_id_round_starts_at_idx" ON "rider_tasks"("rider_id", "round_starts_at");

-- CreateIndex
CREATE INDEX "rider_tasks_hub_id_round_starts_at_idx" ON "rider_tasks"("hub_id", "round_starts_at");

-- CreateIndex
CREATE INDEX "rider_task_stops_rider_task_id_idx" ON "rider_task_stops"("rider_task_id");

-- CreateIndex
CREATE INDEX "rider_task_stops_fulfilment_group_id_idx" ON "rider_task_stops"("fulfilment_group_id");

-- CreateIndex
CREATE INDEX "bag_tag_batches_hub_id_created_at_idx" ON "bag_tag_batches"("hub_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bag_tags_code_key" ON "bag_tags"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bag_tags_fulfilment_group_id_key" ON "bag_tags"("fulfilment_group_id");

-- CreateIndex
CREATE INDEX "bag_tags_batch_id_idx" ON "bag_tags"("batch_id");

-- AddForeignKey
ALTER TABLE "rider_invites" ADD CONSTRAINT "rider_invites_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_invites" ADD CONSTRAINT "rider_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "riders" ADD CONSTRAINT "riders_identity_verified_by_id_fkey" FOREIGN KEY ("identity_verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_tasks" ADD CONSTRAINT "rider_tasks_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_tasks" ADD CONSTRAINT "rider_tasks_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_tasks" ADD CONSTRAINT "rider_tasks_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_tasks" ADD CONSTRAINT "rider_tasks_pickup_location_id_fkey" FOREIGN KEY ("pickup_location_id") REFERENCES "brand_pickup_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_tasks" ADD CONSTRAINT "rider_tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_task_stops" ADD CONSTRAINT "rider_task_stops_rider_task_id_fkey" FOREIGN KEY ("rider_task_id") REFERENCES "rider_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_task_stops" ADD CONSTRAINT "rider_task_stops_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_tag_batches" ADD CONSTRAINT "bag_tag_batches_hub_id_fkey" FOREIGN KEY ("hub_id") REFERENCES "hubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_tags" ADD CONSTRAINT "bag_tags_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "bag_tag_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_tags" ADD CONSTRAINT "bag_tags_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bag_tags" ADD CONSTRAINT "bag_tags_attached_by_rider_id_fkey" FOREIGN KEY ("attached_by_rider_id") REFERENCES "riders"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreatePartialUniqueIndex
CREATE UNIQUE INDEX "rider_task_stops_one_active_stop_per_group_direction_key" ON "rider_task_stops"("fulfilment_group_id", "direction") WHERE "is_active" = true;

-- AddCheckConstraint
ALTER TABLE "riders" ADD CONSTRAINT "riders_identity_last4_shape_check" CHECK ("identity_document_last4" IS NULL OR "identity_document_last4" ~ '^[A-Za-z0-9]{4}$');

-- AddCheckConstraint
ALTER TABLE "riders" ADD CONSTRAINT "riders_identity_verified_together_check" CHECK (("identity_verified_at" IS NULL) = ("identity_document_type" IS NULL));

-- AddCheckConstraint
ALTER TABLE "bag_tag_batches" ADD CONSTRAINT "bag_tag_batches_tag_count_positive_check" CHECK ("tag_count" > 0);

-- AddCheckConstraint
ALTER TABLE "bag_tags" ADD CONSTRAINT "bag_tags_attached_together_check" CHECK (("fulfilment_group_id" IS NULL) = ("attached_at" IS NULL));
