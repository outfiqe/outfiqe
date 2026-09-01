-- CreateTable
CREATE TABLE "impersonation_sessions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "impersonator_id" UUID NOT NULL,
    "target_user_id" UUID NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'read',
    "reason" TEXT NOT NULL,
    "approved_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "impersonation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impersonation_sessions_organization_id_created_at_idx" ON "impersonation_sessions"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "impersonation_sessions_impersonator_id_created_at_idx" ON "impersonation_sessions"("impersonator_id", "created_at");

-- AddForeignKey
ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
