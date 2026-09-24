CREATE UNIQUE INDEX "subscription_invoices_one_open_per_subscription_key" ON "subscription_invoices"("subscription_id") WHERE "status" = 'OPEN';
