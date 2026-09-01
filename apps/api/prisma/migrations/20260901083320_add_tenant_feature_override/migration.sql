-- CreateTable
CREATE TABLE "tenant_feature_overrides" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "set_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_feature_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_feature_overrides_organization_id_idx" ON "tenant_feature_overrides"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_feature_overrides_organization_id_key_key" ON "tenant_feature_overrides"("organization_id", "key");

-- AddForeignKey
ALTER TABLE "tenant_feature_overrides" ADD CONSTRAINT "tenant_feature_overrides_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
