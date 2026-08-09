-- AlterTable
ALTER TABLE "creator_look_products" DROP CONSTRAINT "creator_look_products_pkey";
ALTER TABLE "creator_look_products" ADD COLUMN "id" UUID NOT NULL;
ALTER TABLE "creator_look_products" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "creator_look_products" ADD CONSTRAINT "creator_look_products_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_look_products_creator_look_id_product_id_key" ON "creator_look_products"("creator_look_id", "product_id");
