-- CreateTable
CREATE TABLE "used_purpose_tokens" (
    "jti" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_purpose_tokens_pkey" PRIMARY KEY ("jti")
);

-- CreateIndex
CREATE INDEX "used_purpose_tokens_expires_at_idx" ON "used_purpose_tokens"("expires_at");
