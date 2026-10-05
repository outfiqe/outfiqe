-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('CREATOR_LOOK', 'OUTFIT_BUILD');

-- CreateEnum
CREATE TYPE "OutfitStatus" AS ENUM ('DRAFT', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OutfitVisibility" AS ENUM ('PRIVATE', 'SHARED', 'PUBLIC');

-- CreateEnum
CREATE TYPE "OutfitMemberRole" AS ENUM ('OWNER', 'EDITOR');

-- CreateEnum
CREATE TYPE "OutfitPhotoKind" AS ENUM ('COVER', 'TRY_ON');

-- CreateEnum
CREATE TYPE "OutfitPhotoStatus" AS ENUM ('PROCESSING', 'READY', 'REMOVED');

-- CreateEnum
CREATE TYPE "OutfitEventType" AS ENUM ('CREATED', 'ITEM_ADDED', 'ITEM_SWAPPED', 'ITEM_REMOVED', 'EXTRAS_REORDERED', 'SETTINGS_CHANGED', 'MEMBER_HAPPY', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'MEMBER_LEFT', 'OWNERSHIP_TRANSFERRED', 'LOCKED', 'UNLOCKED', 'ARCHIVED', 'VISIBILITY_CHANGED', 'SHARED', 'PHOTO_ADDED', 'PHOTO_REMOVED');

-- AlterEnum
ALTER TYPE "MessageKind" ADD VALUE 'OUTFIT_CARD';

-- AlterTable
ALTER TABLE "commission_tiers" ADD COLUMN     "scope" "CommissionScope" NOT NULL DEFAULT 'CREATOR_LOOK';

-- AlterTable
ALTER TABLE "creator_looks" ADD COLUMN     "source_outfit_id" UUID,
ADD COLUMN     "source_outfit_version" INTEGER;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "outfit_id" UUID;

-- CreateTable
CREATE TABLE "outfit_slot_types" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "max_items" INTEGER NOT NULL,
    "accepts_any_product_type" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfit_slot_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_slot_type_product_types" (
    "slot_type_id" UUID NOT NULL,
    "product_type_id" UUID NOT NULL,

    CONSTRAINT "outfit_slot_type_product_types_pkey" PRIMARY KEY ("slot_type_id","product_type_id")
);

-- CreateTable
CREATE TABLE "outfit_slot_type_blocks" (
    "slot_type_id" UUID NOT NULL,
    "blocked_slot_type_id" UUID NOT NULL,

    CONSTRAINT "outfit_slot_type_blocks_pkey" PRIMARY KEY ("slot_type_id","blocked_slot_type_id")
);

-- CreateTable
CREATE TABLE "outfits" (
    "id" UUID NOT NULL,
    "title" TEXT,
    "status" "OutfitStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "OutfitVisibility" NOT NULL DEFAULT 'PRIVATE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "budget" INTEGER,
    "max_items_per_member" INTEGER,
    "published_version" INTEGER,
    "created_by_id" UUID,
    "source_conversation_id" UUID,
    "conversation_id" UUID,
    "locked_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_members" (
    "outfit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "OutfitMemberRole" NOT NULL DEFAULT 'EDITOR',
    "is_happy" BOOLEAN NOT NULL DEFAULT false,
    "happy_at" TIMESTAMP(3),
    "invited_by_id" UUID,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_members_pkey" PRIMARY KEY ("outfit_id","user_id")
);

-- CreateTable
CREATE TABLE "outfit_shares" (
    "outfit_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "shared_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_shares_pkey" PRIMARY KEY ("outfit_id","user_id")
);

-- CreateTable
CREATE TABLE "outfit_slots" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "max_items" INTEGER NOT NULL,
    "accepts_any_product_type" BOOLEAN NOT NULL,
    "product_type_ids" UUID[],
    "blocks_slot_keys" TEXT[],
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "outfit_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_items" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "outfit_slot_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "product_id" UUID NOT NULL,
    "added_by_id" UUID,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_photos" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "uploader_id" UUID,
    "kind" "OutfitPhotoKind" NOT NULL,
    "status" "OutfitPhotoStatus" NOT NULL DEFAULT 'PROCESSING',
    "image_asset_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "removed_at" TIMESTAMP(3),
    "removed_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_events" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "actor_id" UUID,
    "type" "OutfitEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outfit_snapshots" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "contributor_ids" UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outfit_slot_types_key_key" ON "outfit_slot_types"("key");

-- CreateIndex
CREATE INDEX "outfit_slot_types_is_active_sort_order_idx" ON "outfit_slot_types"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "outfit_slot_type_product_types_product_type_id_idx" ON "outfit_slot_type_product_types"("product_type_id");

-- CreateIndex
CREATE INDEX "outfit_slot_type_blocks_blocked_slot_type_id_idx" ON "outfit_slot_type_blocks"("blocked_slot_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfits_conversation_id_key" ON "outfits"("conversation_id");

-- CreateIndex
CREATE INDEX "outfits_status_visibility_updated_at_idx" ON "outfits"("status", "visibility", "updated_at");

-- CreateIndex
CREATE INDEX "outfits_created_by_id_idx" ON "outfits"("created_by_id");

-- CreateIndex
CREATE INDEX "outfit_members_user_id_joined_at_idx" ON "outfit_members"("user_id", "joined_at");

-- CreateIndex
CREATE INDEX "outfit_shares_user_id_created_at_idx" ON "outfit_shares"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_slots_outfit_id_key_key" ON "outfit_slots"("outfit_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_slots_id_outfit_id_key" ON "outfit_slots"("id", "outfit_id");

-- CreateIndex
CREATE INDEX "outfit_items_product_id_idx" ON "outfit_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_items_outfit_slot_id_position_key" ON "outfit_items"("outfit_slot_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_items_outfit_id_product_id_key" ON "outfit_items"("outfit_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_photos_image_asset_id_key" ON "outfit_photos"("image_asset_id");

-- CreateIndex
CREATE INDEX "outfit_photos_outfit_id_status_created_at_idx" ON "outfit_photos"("outfit_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "outfit_photos_uploader_id_idx" ON "outfit_photos"("uploader_id");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_events_outfit_id_version_key" ON "outfit_events"("outfit_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "outfit_snapshots_outfit_id_version_key" ON "outfit_snapshots"("outfit_id", "version");

-- CreateIndex
CREATE INDEX "commission_tiers_scope_min_price_idx" ON "commission_tiers"("scope", "min_price");

-- CreateIndex
CREATE INDEX "creator_looks_source_outfit_id_idx" ON "creator_looks"("source_outfit_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_looks_creator_id_source_outfit_id_source_outfit_ver_key" ON "creator_looks"("creator_id", "source_outfit_id", "source_outfit_version");

-- CreateIndex
CREATE INDEX "messages_outfit_id_idx" ON "messages"("outfit_id");

-- AddForeignKey
ALTER TABLE "creator_looks" ADD CONSTRAINT "creator_looks_source_outfit_id_fkey" FOREIGN KEY ("source_outfit_id") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_slot_type_product_types" ADD CONSTRAINT "outfit_slot_type_product_types_slot_type_id_fkey" FOREIGN KEY ("slot_type_id") REFERENCES "outfit_slot_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_slot_type_product_types" ADD CONSTRAINT "outfit_slot_type_product_types_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_slot_type_blocks" ADD CONSTRAINT "outfit_slot_type_blocks_slot_type_id_fkey" FOREIGN KEY ("slot_type_id") REFERENCES "outfit_slot_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_slot_type_blocks" ADD CONSTRAINT "outfit_slot_type_blocks_blocked_slot_type_id_fkey" FOREIGN KEY ("blocked_slot_type_id") REFERENCES "outfit_slot_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_source_conversation_id_fkey" FOREIGN KEY ("source_conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_members" ADD CONSTRAINT "outfit_members_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_members" ADD CONSTRAINT "outfit_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_members" ADD CONSTRAINT "outfit_members_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_shares" ADD CONSTRAINT "outfit_shares_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_shares" ADD CONSTRAINT "outfit_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_shares" ADD CONSTRAINT "outfit_shares_shared_by_id_fkey" FOREIGN KEY ("shared_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_slots" ADD CONSTRAINT "outfit_slots_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_outfit_slot_id_outfit_id_fkey" FOREIGN KEY ("outfit_slot_id", "outfit_id") REFERENCES "outfit_slots"("id", "outfit_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_photos" ADD CONSTRAINT "outfit_photos_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_photos" ADD CONSTRAINT "outfit_photos_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_photos" ADD CONSTRAINT "outfit_photos_removed_by_id_fkey" FOREIGN KEY ("removed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_photos" ADD CONSTRAINT "outfit_photos_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_events" ADD CONSTRAINT "outfit_events_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_events" ADD CONSTRAINT "outfit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outfit_snapshots" ADD CONSTRAINT "outfit_snapshots_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "outfits" ADD CONSTRAINT "outfits_version_non_negative" CHECK ("version" >= 0);
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_budget_non_negative" CHECK ("budget" IS NULL OR "budget" >= 0);
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_max_items_per_member_range" CHECK ("max_items_per_member" IS NULL OR "max_items_per_member" BETWEEN 1 AND 3);
ALTER TABLE "outfits" ADD CONSTRAINT "outfits_published_version_non_negative" CHECK ("published_version" IS NULL OR "published_version" >= 0);
ALTER TABLE "outfit_slot_types" ADD CONSTRAINT "outfit_slot_types_max_items_positive" CHECK ("max_items" >= 1);
ALTER TABLE "outfit_slot_type_blocks" ADD CONSTRAINT "outfit_slot_type_blocks_not_self" CHECK ("slot_type_id" <> "blocked_slot_type_id");
ALTER TABLE "outfit_slots" ADD CONSTRAINT "outfit_slots_max_items_positive" CHECK ("max_items" >= 1);
ALTER TABLE "outfit_items" ADD CONSTRAINT "outfit_items_position_non_negative" CHECK ("position" >= 0);
ALTER TABLE "outfit_events" ADD CONSTRAINT "outfit_events_version_non_negative" CHECK ("version" >= 0);
ALTER TABLE "outfit_snapshots" ADD CONSTRAINT "outfit_snapshots_total_non_negative" CHECK ("total" >= 0);

CREATE UNIQUE INDEX "outfit_members_one_owner_per_outfit_idx" ON "outfit_members"("outfit_id") WHERE "role" = 'OWNER';
CREATE INDEX "outfits_source_conversation_drafts_idx" ON "outfits"("source_conversation_id", "created_at") WHERE "status" = 'DRAFT';

INSERT INTO "product_types" ("id", "slug", "label", "sort_order", "updated_at")
SELECT gen_random_uuid(), new_type.slug, new_type.label,
       (SELECT COALESCE(MAX("sort_order"), -1) FROM "product_types") + new_type.position,
       CURRENT_TIMESTAMP
FROM (VALUES
  ('footwear', 'Footwear', 1),
  ('accessories', 'Accessories', 2),
  ('saree', 'Saree', 3),
  ('kurta-set', 'Kurta set', 4),
  ('lehenga', 'Lehenga', 5)
) AS new_type(slug, label, position)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "size_options" ("id", "product_type_id", "label", "sort_order")
SELECT gen_random_uuid(), product_type."id", new_size.label, new_size.position
FROM (VALUES
  ('footwear', '36', 0), ('footwear', '37', 1), ('footwear', '38', 2), ('footwear', '39', 3),
  ('footwear', '40', 4), ('footwear', '41', 5), ('footwear', '42', 6), ('footwear', '43', 7),
  ('footwear', '44', 8), ('footwear', '45', 9),
  ('accessories', 'One size', 0),
  ('saree', 'Free size', 0),
  ('kurta-set', 'XS', 0), ('kurta-set', 'S', 1), ('kurta-set', 'M', 2),
  ('kurta-set', 'L', 3), ('kurta-set', 'XL', 4), ('kurta-set', 'XXL', 5),
  ('lehenga', 'XS', 0), ('lehenga', 'S', 1), ('lehenga', 'M', 2),
  ('lehenga', 'L', 3), ('lehenga', 'XL', 4)
) AS new_size(type_slug, label, position)
JOIN "product_types" product_type ON product_type."slug" = new_size.type_slug
ON CONFLICT ("product_type_id", "label") DO NOTHING;

INSERT INTO "outfit_slot_types" ("id", "key", "label", "icon", "max_items", "accepts_any_product_type", "sort_order", "updated_at")
VALUES
  (gen_random_uuid(), 'top', 'Top', 'shirt', 1, false, 0, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'bottom', 'Bottom', 'trousers', 1, false, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'full-outfit', 'Full Outfit', 'dress', 1, false, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'footwear', 'Footwear', 'footwear', 1, false, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'accessory', 'Accessory', 'accessory', 1, false, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'extra', 'Extra', 'sparkles', 3, true, 5, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "outfit_slot_type_product_types" ("slot_type_id", "product_type_id")
SELECT slot_type."id", product_type."id"
FROM (VALUES
  ('top', 'tops'), ('top', 'outerwear'),
  ('bottom', 'bottoms'), ('bottom', 'pants'),
  ('full-outfit', 'dresses'), ('full-outfit', 'saree'), ('full-outfit', 'kurta-set'), ('full-outfit', 'lehenga'),
  ('footwear', 'footwear'),
  ('accessory', 'accessories'), ('accessory', 'headwear')
) AS slot_link(slot_key, type_slug)
JOIN "outfit_slot_types" slot_type ON slot_type."key" = slot_link.slot_key
JOIN "product_types" product_type ON product_type."slug" = slot_link.type_slug
ON CONFLICT DO NOTHING;

INSERT INTO "outfit_slot_type_blocks" ("slot_type_id", "blocked_slot_type_id")
SELECT blocking_slot."id", blocked_slot."id"
FROM (VALUES ('full-outfit', 'top'), ('full-outfit', 'bottom')) AS slot_block(blocking_key, blocked_key)
JOIN "outfit_slot_types" blocking_slot ON blocking_slot."key" = slot_block.blocking_key
JOIN "outfit_slot_types" blocked_slot ON blocked_slot."key" = slot_block.blocked_key
ON CONFLICT DO NOTHING;
