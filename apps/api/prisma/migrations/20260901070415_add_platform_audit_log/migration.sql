-- CreateTable
CREATE TABLE "platform_audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "on_behalf_of_user_id" UUID,
    "organization_id" UUID,
    "impersonation_session_id" UUID,
    "action" TEXT NOT NULL,
    "method" TEXT,
    "path" TEXT,
    "status_code" INTEGER,
    "target_type" TEXT,
    "target_id" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_audit_logs_organization_id_created_at_idx" ON "platform_audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_actor_user_id_created_at_idx" ON "platform_audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_audit_logs_impersonation_session_id_created_at_idx" ON "platform_audit_logs"("impersonation_session_id", "created_at");
