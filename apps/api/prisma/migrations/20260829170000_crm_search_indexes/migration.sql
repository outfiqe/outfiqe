CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "deals_title_trgm_idx" ON "deals" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "crm_tickets_title_trgm_idx" ON "crm_tickets" USING GIN ("title" gin_trgm_ops);
