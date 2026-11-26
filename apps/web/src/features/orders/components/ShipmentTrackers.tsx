import type { OrderShipment } from "../api/orderSchemas";
import { OrderTracker } from "./OrderTracker";
import { ShipmentTrackingLine } from "./ShipmentTrackingLine";

type ShipmentTrackersProps = {
  shipments: OrderShipment[];
};

export const ShipmentTrackers = ({ shipments }: ShipmentTrackersProps) => (
  <div className="space-y-6">
    <p className="text-sm font-semibold text-foreground">
      {shipments.length} shipments in this order
    </p>
    {shipments.map((shipment) => (
      <div key={shipment.id} className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">{shipment.brandName}</p>
        <OrderTracker fulfilmentStatus={shipment.status} />
        <ShipmentTrackingLine shipment={shipment} />
      </div>
    ))}
  </div>
);
