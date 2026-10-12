-- DropForeignKey
ALTER TABLE "saved_sizes" DROP CONSTRAINT "saved_sizes_user_id_fkey";

-- DropForeignKey
ALTER TABLE "saved_sizes" DROP CONSTRAINT "saved_sizes_product_type_id_fkey";

-- DropForeignKey
ALTER TABLE "size_options" DROP CONSTRAINT "size_options_product_type_id_fkey";

-- DropTable
DROP TABLE "saved_sizes";

-- DropTable
DROP TABLE "size_options";

