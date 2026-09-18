-- CreateEnum
CREATE TYPE "PostLayout" AS ENUM ('PORTRAIT', 'SQUARE', 'TALL');

-- AlterTable
ALTER TABLE "creator_looks" ADD COLUMN     "layout" "PostLayout" NOT NULL DEFAULT 'PORTRAIT';
