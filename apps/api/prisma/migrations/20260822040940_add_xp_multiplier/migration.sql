-- CreateTable
CREATE TABLE "xp_multipliers" (
    "id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xp_multipliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "xp_multipliers_is_active_starts_at_ends_at_idx" ON "xp_multipliers"("is_active", "starts_at", "ends_at");
