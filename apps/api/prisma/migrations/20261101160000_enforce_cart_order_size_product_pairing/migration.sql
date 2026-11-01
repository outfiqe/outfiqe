-- DropForeignKey
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_size_id_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_size_id_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_product_id_id_key" ON "product_sizes"("product_id", "id");

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_size_id_fkey" FOREIGN KEY ("product_id", "size_id") REFERENCES "product_sizes"("product_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_size_id_fkey" FOREIGN KEY ("product_id", "size_id") REFERENCES "product_sizes"("product_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
