ALTER TABLE "organizations" ADD COLUMN "subdomain" TEXT;

UPDATE "organizations" SET "subdomain" = 'outfiqe' WHERE "subdomain" IS NULL;

ALTER TABLE "organizations" ALTER COLUMN "subdomain" SET NOT NULL;

CREATE UNIQUE INDEX "organizations_subdomain_key" ON "organizations"("subdomain");
