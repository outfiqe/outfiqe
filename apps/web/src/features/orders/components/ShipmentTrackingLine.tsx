import type { OrderShipment } from "../api/orderSchemas";

type ShipmentTrackingLineProps = {
  shipment: Pick<OrderShipment, "carrier" | "trackingNumber">;
};

export const ShipmentTrackingLine = ({ shipment }: ShipmentTrackingLineProps) => {
  const { carrier, trackingNumber } = shipment;
  if (!trackingNumber) return null;

  return (
    <p className="mt-3 text-xs text-muted-foreground">
      {carrier ? `${carrier} · ${trackingNumber}` : trackingNumber}
    </p>
  );
};
