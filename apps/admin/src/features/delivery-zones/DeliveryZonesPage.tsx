import { DeliveryZoneHistorySection } from "./DeliveryZoneHistorySection";
import { DeliveryZonesSection } from "./DeliveryZonesSection";

export const DeliveryZonesPage = () => {
  return (
    <div className="space-y-10">
      <h1 className="font-display text-2xl font-bold text-foreground">Delivery zones</h1>
      <DeliveryZonesSection />
      <DeliveryZoneHistorySection />
    </div>
  );
};
