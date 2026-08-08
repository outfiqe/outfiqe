-- AlterTable
ALTER TABLE "brand_applications" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';

ALTER TABLE "brand_applications" ALTER COLUMN "email" DROP DEFAULT;
