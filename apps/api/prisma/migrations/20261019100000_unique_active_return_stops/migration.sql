DROP INDEX "rider_task_stops_one_active_stop_per_group_direction_key";

CREATE UNIQUE INDEX "rider_task_stops_one_active_collect_stop_per_group_key" ON "rider_task_stops"("fulfilment_group_id") WHERE "is_active" = true AND "direction" = 'COLLECT';

CREATE UNIQUE INDEX "rider_task_stops_one_active_stop_per_return_key" ON "rider_task_stops"("brand_return_id") WHERE "is_active" = true AND "direction" = 'RETURN';

ALTER TABLE "rider_task_stops" ADD CONSTRAINT "rider_task_stops_return_link_check" CHECK (("direction" = 'RETURN') = ("brand_return_id" IS NOT NULL));
