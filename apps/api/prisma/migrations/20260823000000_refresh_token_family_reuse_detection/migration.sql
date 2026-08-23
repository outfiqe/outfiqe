-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" UUID;
ALTER TABLE "refresh_tokens" ADD COLUMN "revoked_at" TIMESTAMP(3);
ALTER TABLE "refresh_tokens" ADD COLUMN "replaced_by_token_hash" TEXT;

-- Backfill: every pre-existing token becomes the sole member of its own new family.
UPDATE "refresh_tokens" SET "family_id" = gen_random_uuid() WHERE "family_id" IS NULL;

-- Now that every row has a value, enforce NOT NULL.
ALTER TABLE "refresh_tokens" ALTER COLUMN "family_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");
