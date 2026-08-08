-- CreateEnum
CREATE TYPE "BrandCategory" AS ENUM ('STREETWEAR', 'TRADITIONAL', 'THRIFT', 'KIDS', 'FORMAL');

-- CreateEnum
CREATE TYPE "MakesOwnPieces" AS ENUM ('MAKES', 'RESELLS', 'BOTH');

-- CreateTable
CREATE TABLE "brand_applications" (
    "id" UUID NOT NULL,
    "brand_name" TEXT NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "category" "BrandCategory" NOT NULL,
    "makes_own_pieces" "MakesOwnPieces" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_applications_pkey" PRIMARY KEY ("id")
);
