/*
  Warnings:

  - Added the required column `brand_name` to the `brand_invites` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "brand_invites" ADD COLUMN     "brand_name" TEXT NOT NULL;
