-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_by" UUID,
ADD COLUMN     "suspension_expires_at" TIMESTAMP(3),
ADD COLUMN     "suspension_reason" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspended_at" TIMESTAMP(3),
ADD COLUMN     "suspended_by" UUID,
ADD COLUMN     "suspension_expires_at" TIMESTAMP(3),
ADD COLUMN     "suspension_reason" TEXT;

-- CreateIndex
CREATE INDEX "brands_account_status_idx" ON "brands"("account_status");

-- CreateIndex
CREATE INDEX "brands_suspension_expires_at_idx" ON "brands"("suspension_expires_at");

-- CreateIndex
CREATE INDEX "users_account_status_idx" ON "users"("account_status");

-- CreateIndex
CREATE INDEX "users_suspension_expires_at_idx" ON "users"("suspension_expires_at");
