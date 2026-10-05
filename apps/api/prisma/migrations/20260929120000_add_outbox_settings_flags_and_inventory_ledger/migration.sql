-- CreateEnum
CREATE TYPE "InventoryMovementKind" AS ENUM ('OPENING_BALANCE', 'SIZE_CREATED', 'ORDER_COMMIT', 'ORDER_RESTORE', 'BRAND_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryMovementSource" AS ENUM ('PRODUCT_SIZE', 'ORDER', 'BRAND_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "FeatureFlagRollout" AS ENUM ('OFF', 'ALLOW_LIST', 'EVERYONE');

-- AlterTable
ALTER TABLE "request_idempotency" ADD COLUMN     "request_hash" TEXT;

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_ledger_entries" (
    "id" UUID NOT NULL,
    "size_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "kind" "InventoryMovementKind" NOT NULL,
    "source_type" "InventoryMovementSource" NOT NULL,
    "source_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "rollout" "FeatureFlagRollout" NOT NULL DEFAULT 'OFF',
    "allowed_user_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "allowed_brand_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "outbox_events_published_at_idx" ON "outbox_events"("published_at");

-- CreateIndex
CREATE INDEX "inventory_ledger_entries_size_id_created_at_idx" ON "inventory_ledger_entries"("size_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_ledger_entries_source_type_source_id_kind_size_id_key" ON "inventory_ledger_entries"("source_type", "source_id", "kind", "size_id");

-- CreateIndex
CREATE INDEX "request_idempotency_created_at_idx" ON "request_idempotency"("created_at");

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "outbox_events_unpublished_created_at_idx" ON "outbox_events"("created_at") WHERE "published_at" IS NULL;

ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_stock_non_negative" CHECK ("stock" >= 0) NOT VALID;
ALTER TABLE "product_sizes" VALIDATE CONSTRAINT "product_sizes_stock_non_negative";

INSERT INTO "inventory_ledger_entries" ("id", "size_id", "delta", "kind", "source_type", "source_id")
SELECT gen_random_uuid(), "id", "stock", 'OPENING_BALANCE', 'PRODUCT_SIZE', "id"::text
FROM "product_sizes";

INSERT INTO "permissions" ("key", "label", "group") VALUES
  ('platform:settings:manage', 'Change platform-wide settings and limits', 'Platform'),
  ('platform:flags:manage', 'Turn platform features on or off and manage who can see them', 'Platform')
ON CONFLICT ("key") DO NOTHING;
