UPDATE "order_fulfilment_groups"
SET "pickup_status" = 'CANCELLED',
    "pickup_status_changed_at" = NOW()
WHERE "status" = 'CANCELLED'
  AND "pickup_status" IN ('AWAITING_BRAND', 'READY_FOR_PICKUP');
