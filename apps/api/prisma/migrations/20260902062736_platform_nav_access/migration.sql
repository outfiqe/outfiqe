-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "is_platform_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "platform_nav_access" (
    "id" UUID NOT NULL,
    "hidden_nav_keys" TEXT[],
    "updated_by_membership_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_nav_access_pkey" PRIMARY KEY ("id")
);
