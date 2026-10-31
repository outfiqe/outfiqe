UPDATE "order_fulfilment_groups" AS fulfilment_group
SET "status" = 'CANCELLED',
    "cancelled_at" = COALESCE(fulfilment_group."cancelled_at", NOW())
FROM "orders" AS parent_order
WHERE fulfilment_group."order_id" = parent_order."id"
  AND parent_order."fulfilment_status" = 'CANCELLED'
  AND fulfilment_group."status" <> 'CANCELLED';

UPDATE "order_fulfilment_groups"
SET "pickup_status" = 'CANCELLED',
    "pickup_status_changed_at" = NOW()
WHERE "status" = 'CANCELLED'
  AND "pickup_status" IN ('AWAITING_BRAND', 'READY_FOR_PICKUP');
