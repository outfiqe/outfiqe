-- CreateEnum
CREATE TYPE "ThriftCondition" AS ENUM ('LIKE_NEW', 'GOOD', 'FAIR');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_thrift" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thrift_condition_notes" TEXT,
ADD COLUMN     "thrift_condition_rating" "ThriftCondition";

-- CreateIndex
CREATE INDEX "products_is_thrift_idx" ON "products"("is_thrift");
